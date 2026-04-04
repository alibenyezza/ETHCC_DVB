import { PredictionRecord, PerformanceHistory } from "../../core/types";

/**
 * Tracks prediction accuracy and realized yields over time.
 * Compares what the agent predicted vs what actually happened.
 * Used to build confidence scores and weight the agent's proposals in the TEE.
 */
export class PerformanceTracker {
  private records: PredictionRecord[] = [];
  private yieldRecords: { yield: number; timestamp: number }[] = [];
  private chain: string;

  constructor(chain: string) {
    this.chain = chain;
  }

  /**
   * Record a prediction vs actual result pair.
   */
  recordPrediction(predicted: number, actual: number): void {
    this.records.push({
      predicted,
      actual,
      timestamp: Date.now(),
    });

    // Keep last 2880 records (~24h at 30s intervals)
    if (this.records.length > 2880) {
      this.records.shift();
    }
  }

  /**
   * Record a realized yield observation.
   */
  recordYield(yieldPct: number): void {
    this.yieldRecords.push({
      yield: yieldPct,
      timestamp: Date.now(),
    });

    // Keep last 20160 records (~7 days at 30s intervals)
    if (this.yieldRecords.length > 20160) {
      this.yieldRecords.shift();
    }
  }

  /**
   * Calculate prediction accuracy over the last N days.
   * Accuracy = 1 - mean absolute error / mean actual
   */
  getAccuracy(days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const relevant = this.records.filter((r) => r.timestamp >= cutoff);

    if (relevant.length < 5) {
      // Not enough data — return moderate confidence
      return 0.75;
    }

    let totalError = 0;
    let totalActual = 0;
    for (const record of relevant) {
      totalError += Math.abs(record.predicted - record.actual);
      totalActual += Math.abs(record.actual);
    }

    if (totalActual === 0) return 0.75;
    const accuracy = 1 - totalError / totalActual;
    return Math.max(0, Math.min(1, Math.round(accuracy * 100) / 100));
  }

  /**
   * Get average realized yield over the last 7 days.
   */
  getLast7dYield(): number {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const relevant = this.yieldRecords.filter((r) => r.timestamp >= cutoff);

    if (relevant.length === 0) return 0;
    const avg = relevant.reduce((sum, r) => sum + r.yield, 0) / relevant.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Build the complete performance history for the proposal.
   */
  getHistory(): PerformanceHistory {
    return {
      recentAccuracy: this.getAccuracy(7),
      accuracy30d: this.getAccuracy(30),
      last7dYield: this.getLast7dYield(),
      records: this.records.slice(-100), // last 100 for reference
    };
  }

  /**
   * Get the total number of recorded predictions.
   */
  getRecordCount(): number {
    return this.records.length;
  }
}
