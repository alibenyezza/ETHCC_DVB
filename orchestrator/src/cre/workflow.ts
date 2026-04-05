// orchestrator/src/cre/workflow.ts

// @ts-ignore
import { Workflow, CronTrigger, EventTrigger } from "@chainlink/cre-sdk";
import { ProposalValidator } from "../tee/ProposalValidator";
import { Reallocator } from "../tee/Reallocator";
import { TxSigner, PaddedBlob } from "../tee/TxSigner";
import { Attestor } from "../attestation/Attestor";
import { AgentProposal, TEEResponse, SignedTxBlob } from "../../../shared/types";

// Mock des adresses d'API des agents
const AGENT_ENDPOINTS = [
  "http://api.agent-base.internal",
  "http://api.agent-arb.internal",
  "http://api.agent-eth.internal"
];

// Instanciation des composants coeur
const validator = new ProposalValidator();
const reallocator = new Reallocator();
const txSigner = new TxSigner();
const attestor = new Attestor();

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
    console.log("[CRE] Starting workflow cycle...");
    // 1. Collecter les proposals de tous les agents (Confidential HTTP via CRE SDK)
    const requests = AGENT_ENDPOINTS.map(endpoint => ({
      url: `${endpoint}/proposal`,
      method: "GET",
      // Les entêtes et l'URL sont chiffrés par le runtime
    }));
    
    // @ts-ignore : confidentialFetch is part of CRE experimental context, mocking behavior here.
    const rawProposals = await context.confidentialFetch(requests);
    
    // Mock for typing in testing
    const proposals: AgentProposal[] = Array.isArray(rawProposals) ? rawProposals : [];
    
    if (proposals.length === 0) {
      console.log("[CRE] No proposals received.");
      return;
    }

    // 2. Valider chaque proposal dans le TEE
    const validations = proposals.map(p => validator.validate(p));
    
    // 3. Verifier si c'est l'heure d'une reallocation
    let reallocation = null;
    let movementsTxs: SignedTxBlob[] = [];
    if (reallocator.shouldReallocate()) {
      reallocation = reallocator.computeReallocation(proposals);
      
      // Signer les transactions de bridge CCTP
      for (const movement of reallocation.movements) {
         const signedBlob = await txSigner.signCCTPTx(movement);
         movementsTxs.push(signedBlob);
      }
    }

    // 4. Préparer les réponses agents
    const teeDecisions = {
        timestamp: Date.now(),
        validations,
        reallocation
    };

    const distributions = proposals.map((proposal, index): TEEResponse => {
       const validation = validations[index];
       const txBlobs: SignedTxBlob[] = [];
       
       if (validation.approved) {
           // En prod: on générerait le vrai calldata pour deposit/harvest à partir de proposal.strategy
           // signedBlob = await txSigner.signStrategyTx(proposal.agent, strategyAddr, calldata)
           // txBlobs.push(signedBlob)
       } else {
           // Reject logic : on pad tout via TxSigner pour que la réponse semble legit
           const dummyBlob: SignedTxBlob = {
               chain: proposal.agent,
               signedTx: "0xMockReject",
               type: "noop"
           };
           // txSigner.padToUniformSize(dummyBlob);
           txBlobs.push(dummyBlob);
       }
       
       return {
           agent: proposal.agent,
           approved: validation.approved,
           txBlobs,
           message: validation.approved ? "Approved" : "Rejected by Security Rules"
       };
    });

    // 5. Distribuer les reponses (messages uniformes a TOUS les agents)
    // @ts-ignore
    await context.distribute(distributions);

    // 6. Generer et ancrer l'attestation sur 0G Chain
    const attestationHash = await attestor.anchor(teeDecisions);
    console.log(`[CRE] Attestation anchored with hash: ${attestationHash}`);
  }
});

// Handler d'urgence
async function handleEmergency(alert: any) {
  console.error("EMERGENCY ALERT TRIGGERED", alert);
  // Bypass le cycle de 30s
  // Withdrawal immediat de la chain en alerte
  // < 10 secondes de temps de reponse
}
