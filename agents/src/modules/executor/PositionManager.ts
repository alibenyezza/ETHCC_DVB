import { ActivePosition, AllocationSplit } from "../../core/types";

/**
 * Tracks active positions deployed across protocols on this chain.
 * Maintains a record of what capital is deployed where.
 */
export class PositionManager {
  private positions: Map<string, ActivePosition> = new Map();
  private chain: string;

  constructor(chain: string) {
    this.chain = chain;
  }

  /**
   * Update positions based on a new approved strategy split.
   */
  updateFromSplit(splits: AllocationSplit[], totalCapital: number): void {
    // Clear old positions
    this.positions.clear();

    for (const split of splits) {
      const amount = (split.percentage / 100) * totalCapital;
      if (amount > 0) {
        this.positions.set(split.poolId, {
          protocol: split.protocol,
          poolId: split.poolId,
          amount,
          entryYield: split.postDepositYield,
          entryTimestamp: Date.now(),
        });
      }
    }

    console.log(
      `[${this.chain}][POSITIONS] Updated: ${this.positions.size} active positions, ` +
        `$${this.getTotalDeployed().toLocaleString()} deployed`
    );
  }

  /**
   * Get all active positions.
   */
  getPositions(): ActivePosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position for a specific pool.
   */
  getPosition(poolId: string): ActivePosition | undefined {
    return this.positions.get(poolId);
  }

  /**
   * Total capital currently deployed across all protocols.
   */
  getTotalDeployed(): number {
    let total = 0;
    for (const pos of this.positions.values()) {
      total += pos.amount;
    }
    return Math.round(total);
  }

  /**
   * Get a summary for logging/display.
   */
  getSummary(): string {
    const entries = Array.from(this.positions.values())
      .map((p) => `${p.protocol}: $${p.amount.toLocaleString()} @ ${p.entryYield.toFixed(1)}%`)
      .join(" | ");
    return entries || "No active positions";
  }
}
