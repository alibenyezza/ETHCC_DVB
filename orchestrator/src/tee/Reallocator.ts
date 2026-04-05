// orchestrator/src/tee/Reallocator.ts

import { AgentProposal, ReallocationPlan, ChainAllocation, CCTPMovement, ChainName, AllocationCurvePoint } from "../../../shared/types";
import { SecurityRules } from "./SecurityRules";

// Simulation des Domain IDs de CCTP V2 testnets
const DOMAIN_IDS: Record<ChainName | "arc", number> = {
  "ETH": 0,
  "AVAX": 1,
  "OP": 2,
  "ARB": 3,
  "BASE": 6,
  "POLY": 7,
  "UNICHAIN": 10,
  "LINEA": 11,
  "SONIC": 13,
  "WORLD": 14,
  "SEI": 16,
  "BNB": 17,
  "INK": 21,
  "arc": 26
};

// Simulation des couts gas/CCTP par chain (en equivalent dollar ou USDC)
const estimateCCTPCost = (chain: string): number => {
  if (chain === "ETH") return 5.0; // Cher sur ETH
  return 0.5; // Pas cher sur les L2
}

export class Reallocator {
  private lastReallocation: number = 0;
  private readonly REALLOC_INTERVAL = 6 * 60 * 60 * 1000; // 6 heures

  shouldReallocate(): boolean {
    return Date.now() - this.lastReallocation > this.REALLOC_INTERVAL;
  }

  // Calcule la reallocation optimale
  computeReallocation(proposals: AgentProposal[]): ReallocationPlan {
    const curves = proposals.map(p => ({
      chain: p.agent,
      curve: p.allocation_curve,
      safety: p.safety.overall_score,
      trackRecord: p.prediction_accuracy_30d,
      currentCapital: p.current_capital
    }));

    // Calculer le total de capital disponible
    const totalCapital = curves.reduce((sum, c) => sum + c.currentCapital, 0);
    const buffer = totalCapital * SecurityRules.BUFFER_PCT / 100;
    const allocatable = totalCapital - buffer;

    // TODO: Implémenter le véritable solveur d'égalisation du yield marginal avec binary search.
    // Pour l'instant, on fait une simulation d'égalisation basique basée sur le capital optimal des agents (proposé par eux)
    
    // Contrainte Max de 50% sur une chaîne
    const maxAllocPerChain = totalCapital * (SecurityRules.MAX_CHAIN_PCT / 100);

    // Initial allocation
    let remainingAllocation = allocatable;
    const targets = curves.map(c => {
      // Simulation: on prend le currentCapital en base et on tente d'équilibrer
      let target = (allocatable / curves.length) * c.safety * c.trackRecord;
      if (target > maxAllocPerChain) target = maxAllocPerChain;
      return { chain: c.chain, target, current: c.currentCapital, safetyScore: c.safety };
    });

    const currentAllocations: ChainAllocation[] = curves.map(c => ({
      chain: c.chain,
      capital: c.currentCapital,
      targetYield: c.curve && c.curve.length > 0 ? c.curve[c.curve.length-1].blended_yield : 0,
      safetyScore: c.safety
    }));

    const targetAllocations: ChainAllocation[] = targets.map(t => ({
      chain: t.chain,
      capital: t.target,
      targetYield: 0, // Simplified for mock
      safetyScore: t.safetyScore
    }));

    // Calculer les mouvements
    const movements = this.computeMovements(currentAllocations, targetAllocations);

    // Filtrer : ne garder que les mouvements rentables > 2x coût CCTP
    const profitableMovements = movements.filter(m => m.projected24hGain > SecurityRules.MIN_REALLOC_GAIN_MULTIPLIER * m.cctpCost);

    // Re-adjust target allocations based on rejected movements
    // En situation réelle, on ré-exécute le solver d'optimisation excluant les chemins non rentables.

    this.lastReallocation = Date.now();

    return {
      allocations: targetAllocations,
      movements: profitableMovements,
      totalCapital,
      buffer,
      timestamp: this.lastReallocation
    };
  }

  private computeMovements(
    current: ChainAllocation[],
    target: ChainAllocation[]
  ): CCTPMovement[] {
    const movements: CCTPMovement[] = [];

    // Tout transite par Arc: source -> Arc -> destination
    for (let i = 0; i < current.length; i++) {
        const diff = target[i].capital - current[i].capital;
        
        if (diff < 0) { // withdraw to Arc
            movements.push({
                from: current[i].chain,
                to: "arc",
                amount: Math.abs(diff),
                domainFrom: DOMAIN_IDS[current[i].chain],
                domainTo: DOMAIN_IDS["arc"],
                cctpCost: estimateCCTPCost(current[i].chain),
                projected24hGain: this.estimateGain(Math.abs(diff)) // Simulation gain 24h
            });
        }
    }

    for (let i = 0; i < target.length; i++) {
        const diff = target[i].capital - current[i].capital;
        if (diff > 0) { // deposit from Arc
            movements.push({
                from: "arc",
                to: target[i].chain,
                amount: diff,
                domainFrom: DOMAIN_IDS["arc"],
                domainTo: DOMAIN_IDS[target[i].chain],
                cctpCost: estimateCCTPCost(target[i].chain),
                projected24hGain: this.estimateGain(diff) // Simulation gain 24h
            });
        }
    }

    return movements;
  }

  // Simulation d'une estimation de gain marginale (ex: 5% APY sur l'amount pour 24h)
  private estimateGain(amount: number): number {
    const dailyAPY = 0.05 / 365;
    return amount * dailyAPY;
  }
}
