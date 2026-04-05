// orchestrator/src/tee/ProposalValidator.ts

import { AgentProposal, RiskAlert } from "../../../shared/types";
import { SecurityRules } from "./SecurityRules";

export interface Check {
  name: string;
  passed: boolean;
  message?: string;
}

export interface ValidationResult {
  agent: string;
  approved: boolean;
  checks: Check[];
}

export class ProposalValidator {
  
  // Valide une proposal d'agent
  validate(proposal: AgentProposal): ValidationResult {
    const checks: Check[] = [];

    // 1. Verifier la signature de l'agent
    checks.push(this.verifySignature(proposal));

    // 2. Safety score > SAFETY_THRESHOLD
    checks.push(this.checkSafetyThreshold(proposal));

    // 3. Alerts critiques
    checks.push(this.checkCriticalAlerts(proposal));

    // 4. Diversification locale
    checks.push(this.checkDiversification(proposal));

    // 5. Coherence des yields
    checks.push(this.checkYieldCoherence(proposal));

    const approved = checks.every(c => c.passed);

    return {
      agent: proposal.agent,
      approved,
      checks
    };
  }

  private verifySignature(proposal: AgentProposal): Check {
    // Dans l'implémentation finale du TEE, on utiliserait ethers.verifyMessage
    // pour s'assurer que la data vient bien d'une IA autorisée
    return { name: "SignatureVerification", passed: true };
  }

  private checkSafetyThreshold(proposal: AgentProposal): Check {
    const passed = proposal.safety.overall_score >= SecurityRules.SAFETY_THRESHOLD;
    return {
      name: "SafetyThreshold",
      passed,
      message: passed ? undefined : `Score ${proposal.safety.overall_score} < ${SecurityRules.SAFETY_THRESHOLD}`
    };
  }

  private checkCriticalAlerts(proposal: AgentProposal): Check {
    const criticalAlerts = proposal.safety.alerts.filter(
      (a: RiskAlert) => a.severity === "critical" || a.severity === "emergency"
    );
    return {
      name: "CriticalAlerts",
      passed: criticalAlerts.length === 0,
      message: criticalAlerts.length > 0 ? "Critical alerts found" : undefined
    };
  }

  private checkDiversification(proposal: AgentProposal): Check {
    // Regle : aucun protocole > LIMIT % du capital local de l'agent
    const tooLargePositions = proposal.strategy.positions.filter(
      p => p.amount_pct > SecurityRules.MAX_PROTOCOL_PCT
    );
    return {
      name: "Diversification",
      passed: tooLargePositions.length === 0,
      message: tooLargePositions.length > 0 ? "Position over 40%" : undefined
    };
  }

  private checkYieldCoherence(proposal: AgentProposal): Check {
    // Regle : post_deposit_yield doit etre < raw_yield (sinon l'agent ment ou une erreur de calcul est faite)
    const incoherentYields = proposal.strategy.positions.filter(
      p => p.action === "deposit" && p.post_deposit_yield >= p.raw_yield
    );
    return {
      name: "YieldCoherence",
      passed: incoherentYields.length === 0,
      message: incoherentYields.length > 0 ? "Incoherent yields detected" : undefined
    };
  }
}
