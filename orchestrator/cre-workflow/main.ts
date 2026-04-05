// ═══════════════════════════════════════════════════════════════
// ArcMind TEE Orchestrator — CRE Workflow
//
// Runs on Chainlink's Decentralized Oracle Network (DON).
// Every 30s, this workflow:
//   1. Fetches agent proposals via ConfidentialHTTPClient (privacy)
//   2. Validates proposals (safety, diversification, yield coherence)
//   3. Computes cross-chain reallocation (every 6h)
//   4. Distributes responses back to agents via HTTPClient (consensus)
//
// Privacy: Agent strategies (alpha) are fetched via encrypted channels.
// The ConfidentialHTTPClient runs inside a DON enclave — API keys
// and strategy data never leave the encrypted boundary.
// ═══════════════════════════════════════════════════════════════

import {
  cre,
  Runner,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type CronPayload,
  ConfidentialHTTPClient,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";

import { validateProposal, type ValidationResult } from "./validate.js";
import { computeReallocation, shouldReallocate, type ReallocationResult } from "./reallocate.js";

// ─── Config type (injected from config.staging.json) ─────────
type ChainConfig = {
  chain: string;
  chainSelector: string;
  strategies: Record<string, string>;
  usdc: string;
};

type Config = {
  schedule: string;
  agentApiUrl: string;
  attestationContract: string;
  attestationChain: string;
  safetyThreshold: number;
  maxProtocolPct: number;
  maxChainPct: number;
  bufferPct: number;
  deployedChains: ChainConfig[];
};

// ─── Proposal & Response types ───────────────────────────────
interface AgentProposal {
  agent: string;
  timestamp: number;
  strategy: {
    positions: Array<{
      protocol: string;
      pool_id: string;
      action: "deposit" | "withdraw" | "harvest";
      amount_pct: number;
      raw_yield: number;
      post_deposit_yield: number;
      reasoning: string;
    }>;
    harvest: {
      pending_rewards_usd: number;
      harvest_profitable: boolean;
      optimal_harvest_time: string;
      reasoning: string;
    };
  };
  allocation_curve: Array<{ capital: number; blended_yield: number }>;
  safety: {
    overall_score: number;
    protocol_scores: Record<string, number>;
    alerts: Array<{ type: string; severity: string; message: string; timestamp: number }>;
    chain_health: { sequencer: string; gas_gwei: number; recent_reorgs: number };
  };
  current_capital: number;
  optimal_capital: number;
  min_useful_capital: number;
  confidence: number;
  last_7d_actual_yield: number;
  prediction_accuracy_30d: number;
}

interface TEEResponse {
  agent: string;
  approved: boolean;
  txBlobs: Array<{ chain: string; signedTx: string; type: string }>;
  newBudget?: number;
  message: string;
}

interface ProposalsAPIResponse {
  proposals: Record<string, AgentProposal>;
  count: number;
  timestamp: number;
}

interface CycleResult {
  cycle_timestamp: number;
  proposals_received: number;
  approved: number;
  rejected: number;
  reallocation: boolean;
  attestation_hash: string;
}

// ═══════════════════════════════════════════════════════════════
// Cron Handler — Main orchestration cycle
// ═══════════════════════════════════════════════════════════════

const onCronTrigger = (runtime: Runtime<Config>, _trigger: CronPayload): CycleResult => {
  const timestamp = Date.now();
  const config = runtime.config;

  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("ArcMind TEE Orchestrator — CRE Workflow Cycle");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ═══ 1. COLLECT — Fetch proposals via Confidential HTTP ═══
  // Privacy: ConfidentialHTTPClient encrypts request/response inside DON enclave.
  // Agent strategies (yield predictions, optimal splits) never leave unencrypted.
  // The API key is injected from vault DON secrets via {{.AGENT_API_KEY}} template.
  runtime.log("[Step 1] Fetching proposals via ConfidentialHTTPClient...");

  const confHTTPClient = new ConfidentialHTTPClient();
  const proposalsResponse = confHTTPClient.sendRequest(runtime, {
    vaultDonSecrets: [
      { key: "AGENT_API_KEY", namespace: "arcmind" },
    ],
    request: {
      url: `${config.agentApiUrl}/proposals`,
      method: "GET",
      multiHeaders: {
        "X-Api-Key": { values: ["{{.AGENT_API_KEY}}"] },
        "Accept": { values: ["application/json"] },
      },
      // Encrypt the response — proposals contain strategy alpha
      encryptOutput: true,
    },
  }).result();

  let proposals: AgentProposal[] = [];
  if (ok(proposalsResponse)) {
    const bodyText = new TextDecoder().decode(proposalsResponse.body);
    const data = JSON.parse(bodyText) as ProposalsAPIResponse;
    proposals = Object.values(data.proposals);
  }

  if (proposals.length === 0) {
    runtime.log("[Step 1] No proposals received — waiting for agents");
    return {
      cycle_timestamp: timestamp,
      proposals_received: 0,
      approved: 0,
      rejected: 0,
      reallocation: false,
      attestation_hash: "none",
    };
  }

  runtime.log(`[Step 1] Received ${proposals.length} proposals: ${proposals.map(p => p.agent).join(", ")}`);

  // ═══ 2. VALIDATE — Security checks inside the DON ═══
  // Each DON node independently validates → BFT consensus ensures agreement.
  // Rules: safety >= 0.7, no critical alerts, max 40% per protocol, yield coherence.
  runtime.log("[Step 2] Validating proposals...");

  const validations = proposals.map(p =>
    validateProposal(p, config.safetyThreshold, config.maxProtocolPct)
  );

  const approvedCount = validations.filter(v => v.approved).length;
  const rejectedCount = validations.filter(v => !v.approved).length;

  for (const v of validations) {
    if (v.approved) {
      runtime.log(`  ${v.agent}: APPROVED`);
    } else {
      runtime.log(`  ${v.agent}: REJECTED — ${v.reasons.join(", ")}`);
    }
  }

  // ═══ 3. REALLOCATE — Cross-chain capital optimization (every 6h) ═══
  let reallocation: ReallocationResult | null = null;
  if (shouldReallocate()) {
    runtime.log("[Step 3] Computing cross-chain reallocation...");
    reallocation = computeReallocation(proposals, config.maxChainPct, config.bufferPct);
    runtime.log(`  Movements: ${reallocation.movements.length}, Buffer: $${reallocation.buffer.toFixed(0)}`);
  } else {
    runtime.log("[Step 3] Reallocation not due — skipping");
  }

  // ═══ 4. BUILD & DISTRIBUTE responses via HTTPClient ═══
  // Build all responses, then send as a single batch POST.
  // CRE limits HTTP calls per execution (5 max), so we batch into one request.
  runtime.log("[Step 4] Building and distributing responses...");

  const allResponses: TEEResponse[] = [];

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    const validation = validations[i];

    // Compute new budget if reallocation happened
    let newBudget: number | undefined;
    if (reallocation) {
      const alloc = reallocation.allocations.find(a => a.chain === proposal.agent);
      if (alloc && alloc.capital !== proposal.current_capital) {
        newBudget = alloc.capital;
      }
    }

    allResponses.push({
      agent: proposal.agent,
      approved: validation.approved,
      txBlobs: [],
      newBudget,
      message: validation.approved
        ? "Approved by CRE TEE"
        : `Rejected: ${validation.reasons.join("; ")}`,
    });
  }

  // Single batch POST — all responses in one HTTP call (DON consensus)
  const httpClient = new cre.capabilities.HTTPClient();
  const batchPayload = JSON.stringify({ responses: allResponses });

  const distributedCount = httpClient
    .sendRequest(
      runtime,
      (sendRequester: HTTPSendRequester, cfg: Config) => {
        const bodyBase64 = Buffer.from(batchPayload).toString("base64");
        const resp = sendRequester.sendRequest({
          url: `${cfg.agentApiUrl}/tee/responses`,
          method: "POST",
          body: bodyBase64,
          headers: { "Content-Type": "application/json" },
          cacheSettings: { store: true, maxAge: "30s" },
        }).result();
        if (!ok(resp)) return 0;
        const result = JSON.parse(new TextDecoder().decode(resp.body));
        return (result.received as number) || 0;
      },
      consensusIdenticalAggregation<number>()
    )(config)
    .result();

  runtime.log(`[Step 4] Distributed ${distributedCount}/${proposals.length} responses (batch)`);

  // ═══ 5. ATTEST — Generate decision hash ═══
  // Deterministic hash of decisions — all DON nodes produce the same hash.
  // In production: use runtime.report() + EVMClient.writeReport() to anchor on-chain.
  const attestPayload = JSON.stringify({
    t: timestamp,
    n: validations.length,
    a: approvedCount,
    r: reallocation !== null,
  });

  let hash = 0;
  for (let i = 0; i < attestPayload.length; i++) {
    hash = ((hash << 5) - hash) + attestPayload.charCodeAt(i);
    hash |= 0;
  }
  const attestationHash = `0xAttestation_${Math.abs(hash).toString(16).padStart(16, "0")}`;

  runtime.log(`[Step 5] Attestation: ${attestationHash}`);
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log(`Cycle complete: ${approvedCount} approved, ${rejectedCount} rejected`);
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return {
    cycle_timestamp: timestamp,
    proposals_received: proposals.length,
    approved: approvedCount,
    rejected: rejectedCount,
    reallocation: reallocation !== null,
    attestation_hash: attestationHash,
  };
};

// ═══════════════════════════════════════════════════════════════
// Workflow Registration
// ═══════════════════════════════════════════════════════════════

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
