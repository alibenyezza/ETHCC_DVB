import { ethers } from "ethers";
import { AgentConfig } from "./AgentConfig";
import {
  ChainName,
  YieldData,
  RiskScore,
  PoolData,
  AgentProposal,
  TEEResponse,
  AllocationSplit,
} from "./types";
import { MarketDataProvider } from "../data/MarketDataProvider";
import { YieldObserver } from "../modules/observer/YieldObserver";
import { RiskObserver } from "../modules/observer/RiskObserver";
import { DepositImpact } from "../modules/reasoner/DepositImpact";
import { RiskScorer } from "../modules/reasoner/RiskScorer";
import { ProposalBuilder } from "../modules/proposer/ProposalBuilder";
import { YieldCurveGenerator } from "../modules/proposer/YieldCurve";
import { TxBroadcaster } from "../modules/executor/TxBroadcaster";
import { PositionManager } from "../modules/executor/PositionManager";
import { PerformanceTracker } from "../modules/learner/PerformanceTracker";
import { ZeroGCompute } from "../integrations/ZeroGCompute";
import { ZeroGStorage } from "../integrations/ZeroGStorage";

/**
 * Autonomous AI Agent for a single chain.
 *
 * Each agent is a fully autonomous fund manager that:
 * 1. OBSERVES — collects yield and risk data from all protocols on its chain
 * 2. REASONS  — models deposit impact, computes optimal splits, predicts trends
 * 3. PROPOSES — builds a strategy proposal and sends it to the TEE
 * 4. EXECUTES — broadcasts approved transactions
 * 5. LEARNS   — tracks performance and improves over time
 *
 * The agent sees ONLY its own chain. It knows nothing about other chains,
 * other agents, or the cross-chain allocation strategy.
 */
export class Agent {
  readonly chain: ChainName;
  readonly chainId: number;

  private config: AgentConfig;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private running: boolean = false;
  private cycleCount: number = 0;
  private currentCapital: number;

  // Modules
  private marketData: MarketDataProvider;
  private yieldObserver: YieldObserver;
  private riskObserver: RiskObserver;
  private depositImpact: DepositImpact;
  private riskScorer: RiskScorer;
  private proposalBuilder: ProposalBuilder;
  private yieldCurveGen: YieldCurveGenerator;
  private txBroadcaster: TxBroadcaster;
  private positionManager: PositionManager;
  private performanceTracker: PerformanceTracker;

  // 0G Integrations
  private zgCompute: ZeroGCompute;
  private zgStorage: ZeroGStorage;

  constructor(config: AgentConfig) {
    this.config = config;
    this.chain = config.chain;
    this.chainId = config.chainId;
    this.currentCapital = config.initialCapital;

    this.provider = new ethers.JsonRpcProvider(config.rpc);
    this.wallet = new ethers.Wallet(
      config.privateKey || ethers.Wallet.createRandom().privateKey,
      this.provider
    );

    // Initialize modules
    this.marketData = new MarketDataProvider(config);
    this.yieldObserver = new YieldObserver(config.chain, this.marketData);
    this.riskObserver = new RiskObserver(config.chain, this.marketData);
    this.depositImpact = new DepositImpact();
    this.riskScorer = new RiskScorer();
    this.proposalBuilder = new ProposalBuilder(this.riskScorer);
    this.yieldCurveGen = new YieldCurveGenerator(this.marketData, this.depositImpact);
    this.txBroadcaster = new TxBroadcaster(config.chain, this.provider);
    this.positionManager = new PositionManager(config.chain);
    this.performanceTracker = new PerformanceTracker(config.chain);

    // 0G Integrations
    this.zgCompute = new ZeroGCompute(config.chain, config.zg.privateKey, config.zg.rpc);
    this.zgStorage = new ZeroGStorage(
      config.chain,
      config.zg.privateKey,
      config.zg.rpc,
      config.zg.indexerRpc
    );
  }

  /**
   * Initialize 0G integrations (optional, non-blocking).
   */
  async initialize(): Promise<void> {
    console.log(`\n[${this.chain}] ════════════════════════════════════════`);
    console.log(`[${this.chain}] Initializing agent for ${this.chain} (chain ${this.chainId})`);
    console.log(`[${this.chain}] Wallet: ${this.wallet.address}`);
    console.log(`[${this.chain}] Capital: $${this.currentCapital.toLocaleString()}`);
    console.log(`[${this.chain}] Protocols: ${this.config.protocols.map((p) => p.name).join(", ")}`);

    // Initialize 0G (non-blocking — agent works without it)
    await Promise.allSettled([this.zgCompute.init(), this.zgStorage.init()]);

    console.log(
      `[${this.chain}] 0G Compute: ${this.zgCompute.isInitialized() ? "CONNECTED" : "LOCAL MODE"}`
    );
    console.log(
      `[${this.chain}] 0G Storage: ${this.zgStorage.isInitialized() ? "CONNECTED" : "LOCAL MODE"}`
    );

    // Pre-fetch DeFiLlama data to show data source status
    await this.marketData.getYieldData();
    console.log(`[${this.chain}] Data Source: ${this.marketData.getDataSourceSummary()}`);
    console.log(`[${this.chain}] ════════════════════════════════════════\n`);
  }

  /**
   * Main agent loop. Runs continuously at the configured interval.
   */
  async run(): Promise<void> {
    await this.initialize();
    this.running = true;

    console.log(`[${this.chain}] Agent started — cycle every ${this.config.cycleIntervalMs / 1000}s`);

    while (this.running) {
      try {
        await this.cycle();
      } catch (error: any) {
        console.error(`[${this.chain}][ERROR] Cycle ${this.cycleCount} failed: ${error.message}`);
      }

      await sleep(this.config.cycleIntervalMs);
    }

    console.log(`[${this.chain}] Agent stopped`);
  }

  /**
   * Execute one full agent cycle.
   */
  private async cycle(): Promise<void> {
    this.cycleCount++;
    const start = Date.now();
    console.log(`\n[${this.chain}] ─── Cycle ${this.cycleCount} ───`);

    // ═══ 1. OBSERVE ═══
    const yields: YieldData[] = await this.yieldObserver.observe();
    // Pass discovered protocol names so risk assessment covers live protocols too
    const discoveredProtocols = [...new Set(yields.map((y) => y.protocol))];
    const riskScores: RiskScore[] = await this.riskObserver.assessAll(discoveredProtocols);

    // ═══ 2. REASON ═══
    // Check if safe to operate
    if (!this.riskScorer.isSafeToOperate(riskScores)) {
      console.log(`[${this.chain}][REASON] Safety below threshold — skipping cycle`);
      return;
    }

    // Filter out risky protocols
    const excluded = this.riskScorer.getExcludedProtocols(riskScores);
    const safeYields = yields.filter((y) => !excluded.includes(y.protocol));

    // Build pool data for deposit impact calculation
    const pools: PoolData[] = safeYields.map((y) => ({
      protocol: y.protocol,
      poolId: y.poolId,
      totalSupply: y.totalSupply,
      totalBorrow: y.totalBorrow,
      rateModel: this.marketData.getRateModelParams(y.protocol) || {
        baseRate: 0.01,
        slope1: 0.04,
        slope2: 0.75,
        kink: 0.8,
      },
      currentAPY: y.supplyRateAPY,
      rewardAPY: y.rewardAPY,
    }));

    // Compute optimal split
    const optimalSplit: AllocationSplit[] = this.depositImpact.computeOptimalSplit(
      pools,
      this.currentCapital
    );

    // ML prediction (0G Compute or local fallback)
    const prediction = await this.zgCompute.predict(safeYields);

    // Generate yield curve for TEE reallocation
    const yieldCurve = this.yieldCurveGen.generate(safeYields);
    const optimalCapital = this.yieldCurveGen.computeOptimalCapital(safeYields);

    console.log(
      `[${this.chain}][REASON] Split: ${optimalSplit.map((s) => `${s.protocol} ${s.percentage}%`).join(", ")}`
    );

    // ═══ 3. PROPOSE ═══
    const history = this.performanceTracker.getHistory();
    const proposal: AgentProposal = this.proposalBuilder.build(
      this.chain,
      safeYields,
      riskScores,
      optimalSplit,
      yieldCurve,
      this.currentCapital,
      optimalCapital,
      history
    );

    // ═══ 4. SEND to TEE ═══
    const teeResponse = await this.sendToTEE(proposal);

    // ═══ 5. EXECUTE ═══
    if (teeResponse.approved && teeResponse.txBlobs.length > 0) {
      await this.txBroadcaster.execute(teeResponse.txBlobs);
    }

    // Update positions based on the approved strategy
    this.positionManager.updateFromSplit(optimalSplit, this.currentCapital);

    // Handle budget changes from TEE reallocation
    if (teeResponse.newBudget !== undefined) {
      console.log(
        `[${this.chain}][BUDGET] Capital changed: $${this.currentCapital} -> $${teeResponse.newBudget}`
      );
      this.currentCapital = teeResponse.newBudget;
    }

    // ═══ 6. LEARN ═══
    // Record predictions for accuracy tracking
    for (const pred of prediction.predictions) {
      const actual = safeYields.find((y) => y.protocol === pred.protocol);
      if (actual) {
        this.performanceTracker.recordPrediction(pred.predicted24hAPY, actual.effectiveAPY);
      }
    }

    // Record current blended yield
    const blendedYield = optimalSplit.reduce(
      (sum, s) => sum + s.postDepositYield * (s.percentage / 100),
      0
    );
    this.performanceTracker.recordYield(blendedYield);

    // Persist to 0G Storage
    await this.zgStorage.storeYieldHistory({
      cycle: this.cycleCount,
      timestamp: Date.now(),
      yields: safeYields,
      blendedYield,
    });
    await this.zgStorage.storePerformanceLog(this.performanceTracker.getHistory());

    const elapsed = Date.now() - start;
    console.log(
      `[${this.chain}] ─── Cycle ${this.cycleCount} complete (${elapsed}ms) ─── ` +
        `Blended: ${blendedYield.toFixed(2)}% | Positions: ${this.positionManager.getSummary()}`
    );
  }

  /**
   * Send proposal to TEE and get response.
   * If no TEE endpoint is configured, auto-approves (standalone mode).
   */
  private async sendToTEE(proposal: AgentProposal): Promise<TEEResponse> {
    if (this.config.tee.proposalEndpoint) {
      try {
        const response = await fetch(this.config.tee.proposalEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proposal),
        });

        if (response.ok) {
          return (await response.json()) as TEEResponse;
        }
      } catch (error: any) {
        console.log(`[${this.chain}][TEE] Connection failed: ${error.message} — standalone mode`);
      }
    }

    // Standalone mode: auto-approve
    console.log(`[${this.chain}][TEE] Standalone mode — proposal auto-approved`);
    return {
      agent: this.chain,
      approved: true,
      txBlobs: [],
      message: "Auto-approved (standalone mode)",
    };
  }

  /**
   * Stop the agent gracefully.
   */
  stop(): void {
    console.log(`[${this.chain}] Stopping agent...`);
    this.running = false;
  }

  /**
   * Get current agent state (for dashboard API).
   */
  getState() {
    return {
      chain: this.chain,
      chainId: this.chainId,
      running: this.running,
      cycleCount: this.cycleCount,
      currentCapital: this.currentCapital,
      positions: this.positionManager.getPositions(),
      performance: this.performanceTracker.getHistory(),
      zgComputeConnected: this.zgCompute.isInitialized(),
      zgStorageConnected: this.zgStorage.isInitialized(),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
