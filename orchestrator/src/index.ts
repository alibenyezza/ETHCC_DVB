// orchestrator/src/index.ts — Standalone TEE Orchestrator runner
//
// Runs the TEE workflow cycle outside of Chainlink CRE.
// Connects to agent API at AGENT_API_URL (default: http://localhost:3100)
//
// Usage:
//   npx ts-node src/index.ts
//   AGENT_API_URL=http://localhost:3100 npx ts-node src/index.ts

import * as dotenv from "dotenv";
dotenv.config();

import { ProposalValidator } from "./tee/ProposalValidator";
import { Reallocator } from "./tee/Reallocator";
import { TxSigner } from "./tee/TxSigner";
import { Attestor } from "./attestation/Attestor";
import { AgentProposal, TEEResponse, SignedTxBlob } from "../../shared/types";

const AGENT_API_BASE = process.env.AGENT_API_URL || "http://localhost:3100";
const CYCLE_INTERVAL = parseInt(process.env.TEE_CYCLE_MS || "30000");

const validator = new ProposalValidator();
const reallocator = new Reallocator();
const txSigner = new TxSigner();
const attestor = new Attestor();

async function fetchProposals(): Promise<AgentProposal[]> {
  try {
    const response = await fetch(`${AGENT_API_BASE}/proposals`);
    if (!response.ok) return [];
    const data = await response.json();
    const proposalsMap = (data as any).proposals || {};
    return Object.values(proposalsMap) as AgentProposal[];
  } catch (error: any) {
    console.error(`[TEE] Agent API unreachable: ${error.message}`);
    return [];
  }
}

async function sendResponse(chain: string, teeResponse: TEEResponse): Promise<void> {
  try {
    await fetch(`${AGENT_API_BASE}/tee/response/${chain.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teeResponse),
    });
  } catch {}
}

async function cycle(): Promise<void> {
  console.log("\n[TEE] ─── Cycle start ───");
  txSigner.resetNonceOffsets();

  // 1. Fetch
  const proposals = await fetchProposals();
  if (proposals.length === 0) {
    console.log("[TEE] No proposals — waiting for agents...");
    return;
  }
  console.log(`[TEE] ${proposals.length} proposals: ${proposals.map(p => p.agent).join(", ")}`);

  // 2. Validate
  const validations = proposals.map(p => validator.validate(p));
  for (const v of validations) {
    const failedChecks = v.checks.filter(c => !c.passed);
    if (v.approved) {
      console.log(`[TEE] ${v.agent}: APPROVED`);
    } else {
      console.log(`[TEE] ${v.agent}: REJECTED — ${failedChecks.map(c => c.message).join(", ")}`);
    }
  }

  // 3. Reallocate (every 6h)
  let reallocation = null;
  let movementsTxs: SignedTxBlob[] = [];
  if (reallocator.shouldReallocate()) {
    reallocation = reallocator.computeReallocation(proposals);
    console.log(`[TEE] Reallocation: ${reallocation.movements.length} movements, buffer $${reallocation.buffer.toFixed(0)}`);
    for (const movement of reallocation.movements) {
      const signedBlob = await txSigner.signCCTPTx(movement);
      movementsTxs.push(signedBlob);
    }
  }

  // 4. Build & distribute responses
  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    const validation = validations[i];
    const txBlobs: SignedTxBlob[] = [];

    if (validation.approved) {
      for (const position of proposal.strategy.positions) {
        if (position.action === "deposit" || position.action === "withdraw") {
          const blobs = await txSigner.signStrategyTxFromProposal(proposal.agent, position);
          txBlobs.push(...blobs);
        }
      }
      const chainMovements = movementsTxs.filter(m => m.chain === proposal.agent);
      txBlobs.push(...chainMovements);
    } else {
      txBlobs.push({ chain: proposal.agent, signedTx: "0x" + "00".repeat(32), type: "noop" });
    }

    let newBudget: number | undefined;
    if (reallocation) {
      const alloc = reallocation.allocations.find(a => a.chain === proposal.agent);
      if (alloc && alloc.capital !== proposal.current_capital) {
        newBudget = alloc.capital;
      }
    }

    const response: TEEResponse = {
      agent: proposal.agent,
      approved: validation.approved,
      txBlobs,
      newBudget,
      message: validation.approved ? "Approved by TEE" : `Rejected: ${validation.checks.filter(c => !c.passed).map(c => c.message).join("; ")}`,
    };

    await sendResponse(response.agent, response);
  }

  // 5. Attest
  const attestationHash = await attestor.anchor({
    timestamp: Date.now(),
    validations,
    reallocation,
  });
  console.log(`[TEE] Attestation: ${attestationHash}`);
  console.log("[TEE] ─── Cycle complete ───");
}

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ArcMind TEE Orchestrator — Standalone Mode");
  console.log(`  Agent API: ${AGENT_API_BASE}`);
  console.log(`  Cycle interval: ${CYCLE_INTERVAL / 1000}s`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Run loop
  while (true) {
    try {
      await cycle();
    } catch (error: any) {
      console.error(`[TEE] Cycle error: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, CYCLE_INTERVAL));
  }
}

const shutdown = () => {
  console.log("\n[TEE] Shutting down...");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
