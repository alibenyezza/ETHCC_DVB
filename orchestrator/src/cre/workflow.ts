// orchestrator/src/cre/workflow.ts

// @ts-ignore — CRE SDK imported for Chainlink TEE compatibility
import { Workflow, CronTrigger, EventTrigger } from "@chainlink/cre-sdk";
import { ProposalValidator } from "../tee/ProposalValidator";
import { Reallocator } from "../tee/Reallocator";
import { TxSigner } from "../tee/TxSigner";
import { Attestor } from "../attestation/Attestor";
import { AgentProposal, TEEResponse, SignedTxBlob, ChainName } from "../../../shared/types";

// ═══════════════════════════════════════════════════════════
// Agent API — single server exposes all agents' proposals
// ═══════════════════════════════════════════════════════════
const AGENT_API_BASE = process.env.AGENT_API_URL || "http://localhost:3100";

// Instanciation des composants coeur
const validator = new ProposalValidator();
const reallocator = new Reallocator();
const txSigner = new TxSigner();
const attestor = new Attestor();

/**
 * Fetch all proposals from the agent API server.
 * Returns an array of AgentProposal objects.
 */
async function fetchProposals(): Promise<AgentProposal[]> {
  try {
    const response = await fetch(`${AGENT_API_BASE}/proposals`);
    if (!response.ok) {
      console.error(`[CRE] Agent API returned ${response.status}`);
      return [];
    }
    const data = await response.json();
    // API returns { proposals: { chain: proposal }, count, timestamp }
    const proposalsMap = (data as any).proposals || {};
    return Object.values(proposalsMap) as AgentProposal[];
  } catch (error: any) {
    console.error(`[CRE] Failed to fetch proposals: ${error.message}`);
    return [];
  }
}

/**
 * Send TEE response back to an agent via the agent API server.
 */
async function sendResponseToAgent(chain: string, teeResponse: TEEResponse): Promise<void> {
  try {
    await fetch(`${AGENT_API_BASE}/tee/response/${chain.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teeResponse),
    });
  } catch (error: any) {
    console.error(`[CRE] Failed to send response to ${chain}: ${error.message}`);
  }
}

export const arcMindWorkflow = new Workflow({
  name: "arcmind-swarm-cycle",

  triggers: [
    // Trigger 1 : toutes les 30 secondes
    new CronTrigger({ schedule: "*/30 * * * * *" }),

    // Trigger 2 : sur alerte critique d'un agent
    new EventTrigger({
      event: "agent.critical_alert",
      handler: handleEmergency
    })
  ],

  // Cycle normal (30s)
  async execute(context: any) {
    console.log("[CRE] ─── Starting workflow cycle ───");

    // ═══ 1. COLLECT — Fetch proposals from all agents ═══
    // In CRE production: context.confidentialFetch() encrypts the request
    // In standalone mode: direct HTTP fetch from agent API
    let proposals: AgentProposal[];
    if (context?.confidentialFetch) {
      // CRE runtime — encrypted fetch
      const rawProposals = await context.confidentialFetch([{
        url: `${AGENT_API_BASE}/proposals`,
        method: "GET",
      }]);
      const data = Array.isArray(rawProposals) ? rawProposals[0] : rawProposals;
      const proposalsMap = data?.proposals || {};
      proposals = Object.values(proposalsMap) as AgentProposal[];
    } else {
      // Standalone mode — direct HTTP
      proposals = await fetchProposals();
    }

    if (proposals.length === 0) {
      console.log("[CRE] No proposals received — waiting for agents.");
      return;
    }
    console.log(`[CRE] Received ${proposals.length} proposals: ${proposals.map(p => p.agent).join(", ")}`);

    // ═══ 2. VALIDATE — Security checks in the TEE ═══
    const validations = proposals.map(p => validator.validate(p));
    const approved = validations.filter(v => v.approved).length;
    const rejected = validations.filter(v => !v.approved).length;
    console.log(`[CRE] Validation: ${approved} approved, ${rejected} rejected`);

    // ═══ 3. REALLOCATE — Cross-chain capital optimization (every 6h) ═══
    let reallocation = null;
    let movementsTxs: SignedTxBlob[] = [];
    if (reallocator.shouldReallocate()) {
      reallocation = reallocator.computeReallocation(proposals);
      console.log(`[CRE] Reallocation: ${reallocation.movements.length} movements, buffer: $${reallocation.buffer.toFixed(0)}`);

      // Sign CCTP bridge transactions for movements
      for (const movement of reallocation.movements) {
         const signedBlob = await txSigner.signCCTPTx(movement);
         movementsTxs.push(signedBlob);
      }
    }

    // ═══ 4. SIGN & BUILD responses ═══
    const teeDecisions = {
        timestamp: Date.now(),
        validations,
        reallocation
    };

    const distributions: TEEResponse[] = [];
    for (let i = 0; i < proposals.length; i++) {
       const proposal = proposals[i];
       const validation = validations[i];
       const txBlobs: SignedTxBlob[] = [];

       if (validation.approved) {
           // Generate real calldata for deposit actions (approve + deposit)
           for (const position of proposal.strategy.positions) {
             if (position.action === "deposit" || position.action === "withdraw") {
               const signedBlobs = await txSigner.signStrategyTxFromProposal(
                 proposal.agent,
                 position
               );
               txBlobs.push(...signedBlobs);
             }
           }
           // Append CCTP movements targeting this chain
           const chainMovements = movementsTxs.filter(m => m.chain === proposal.agent);
           txBlobs.push(...chainMovements);
       } else {
           // Reject: pad a noop blob so response size is indistinguishable
           const noopBlob: SignedTxBlob = {
               chain: proposal.agent,
               signedTx: "0x" + "00".repeat(32),
               type: "noop"
           };
           txBlobs.push(noopBlob);
       }

       // Apply new budget from reallocation
       let newBudget: number | undefined;
       if (reallocation) {
         const chainAlloc = reallocation.allocations.find(a => a.chain === proposal.agent);
         if (chainAlloc && chainAlloc.capital !== proposal.current_capital) {
           newBudget = chainAlloc.capital;
         }
       }

       const response: TEEResponse = {
           agent: proposal.agent,
           approved: validation.approved,
           txBlobs,
           newBudget,
           message: validation.approved ? "Approved by TEE" : `Rejected: ${validation.checks.filter(c => !c.passed).map(c => c.message).join("; ")}`
       };
       distributions.push(response);
    }

    // ═══ 5. DISTRIBUTE — Send responses to all agents ═══
    if (context?.distribute) {
      // CRE runtime — encrypted distribution
      await context.distribute(distributions);
    } else {
      // Standalone mode — direct HTTP POST
      for (const response of distributions) {
        await sendResponseToAgent(response.agent, response);
      }
    }
    console.log(`[CRE] Distributed ${distributions.length} responses`);

    // ═══ 6. ATTEST — Anchor decision hash to 0G Chain ═══
    const attestationHash = await attestor.anchor(teeDecisions);
    console.log(`[CRE] Attestation: ${attestationHash}`);
    console.log("[CRE] ─── Cycle complete ───\n");
  }
});

// Handler d'urgence — bypass le cycle de 30s
async function handleEmergency(alert: any) {
  console.error("[CRE] EMERGENCY ALERT TRIGGERED:", alert);
  // In production: immediate withdrawal from the alerted chain
  // Response time target: < 10 seconds
  const proposals = await fetchProposals();
  const alertedChain = alert?.chain;
  if (alertedChain) {
    const response: TEEResponse = {
      agent: alertedChain,
      approved: false,
      txBlobs: [],
      message: `Emergency withdrawal triggered: ${alert.message || "unknown"}`
    };
    await sendResponseToAgent(alertedChain, response);
  }
}
