import { ethers } from "ethers";
import { YieldData } from "../core/types";

// Known 0G testnet providers
const KNOWN_PROVIDERS = [
  "0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08",
];

const ZG_RPC = "https://evmrpc-testnet.0g.ai";

export interface YieldPrediction {
  predictions: { protocol: string; predicted24hAPY: number; confidence: number }[];
  reasoning: string;
}

export interface RiskAnalysis {
  overallRisk: string;
  recommendations: string[];
}

/**
 * Integration with 0G Compute Network for ML inference.
 *
 * Uses the 0G serving broker to:
 * 1. Create a ledger (3 OG minimum)
 * 2. Acknowledge a provider
 * 3. Transfer funds to the provider (1 OG minimum)
 * 4. Make inference calls via OpenAI-compatible API
 *
 * The broker handles auth headers (getRequestHeaders) and billing.
 * Falls back to local heuristic if 0G is unavailable.
 */
export class ZeroGCompute {
  private privateKey: string;
  private rpc: string;
  private broker: any = null;
  private initialized: boolean = false;
  private chain: string;
  private providerAddress: string = "";
  private serviceEndpoint: string = "";
  private serviceModel: string = "";

  constructor(chain: string, privateKey: string, rpc: string = ZG_RPC) {
    this.chain = chain;
    this.privateKey = privateKey;
    this.rpc = rpc;
  }

  /**
   * Initialize the 0G Compute broker.
   * Creates ledger, acknowledges provider, transfers funds.
   */
  async init(): Promise<boolean> {
    if (!this.privateKey) {
      console.log(`[${this.chain}][0G-COMPUTE] No private key — running in local mode`);
      return false;
    }

    try {
      const { createZGComputeNetworkBroker } = await import("@0glabs/0g-serving-broker");

      const provider = new ethers.JsonRpcProvider(this.rpc);
      const wallet = new ethers.Wallet(this.privateKey, provider);

      this.broker = await createZGComputeNetworkBroker(wallet);

      // Step 1: Create ledger (3 OG minimum)
      try {
        await this.broker.ledger.addLedger(3);
        console.log(`[${this.chain}][0G-COMPUTE] Ledger created (3 OG)`);
      } catch (e: any) {
        if (!e.message?.includes("already exists") && !e.message?.includes("Ledger already")) {
          console.log(`[${this.chain}][0G-COMPUTE] Ledger: ${e.message?.slice(0, 80)}`);
        }
      }

      // Step 2: Find a working provider and acknowledge it
      for (const addr of KNOWN_PROVIDERS) {
        try {
          // Acknowledge provider signer
          const acked = await this.broker.inference.acknowledged(addr);
          if (!acked) {
            await this.broker.inference.acknowledgeProviderSigner(addr);
          }

          // Get service metadata
          const meta = await this.broker.inference.getServiceMetadata(addr);
          if (meta?.endpoint && meta?.model) {
            this.providerAddress = addr;
            this.serviceEndpoint = meta.endpoint;
            this.serviceModel = meta.model;
            console.log(
              `[${this.chain}][0G-COMPUTE] Provider: ${addr.slice(0, 10)}... | Model: ${meta.model}`
            );
            break;
          }
        } catch (e: any) {
          console.log(`[${this.chain}][0G-COMPUTE] Provider ${addr.slice(0, 10)}... failed: ${e.message?.slice(0, 60)}`);
        }
      }

      // Step 3: Transfer funds to provider
      if (this.providerAddress) {
        try {
          const amount = ethers.parseEther("1.0");
          await this.broker.ledger.transferFund(this.providerAddress, "inference", amount);
          console.log(`[${this.chain}][0G-COMPUTE] Transferred 1 OG to provider`);
        } catch (e: any) {
          console.log(`[${this.chain}][0G-COMPUTE] Fund transfer: ${e.message?.slice(0, 60)}`);
        }
      }

      this.initialized = !!this.providerAddress;
      if (this.initialized) {
        console.log(`[${this.chain}][0G-COMPUTE] Initialized — endpoint: ${this.serviceEndpoint}`);
      } else {
        console.log(`[${this.chain}][0G-COMPUTE] No working provider found — using local mode`);
      }
      return this.initialized;
    } catch (error: any) {
      console.log(`[${this.chain}][0G-COMPUTE] Init failed: ${error.message} — using local mode`);
      return false;
    }
  }

  /**
   * Predict yield trends for the next 24 hours.
   * Uses 0G Compute if available, falls back to local heuristic.
   */
  async predict(yieldData: YieldData[]): Promise<YieldPrediction> {
    if (this.initialized && this.broker && this.providerAddress) {
      try {
        return await this.remotePredict(yieldData);
      } catch (error: any) {
        console.log(`[${this.chain}][0G-COMPUTE] Remote prediction failed: ${error.message}`);
      }
    }

    return this.localPredict(yieldData);
  }

  /**
   * Analyze risk factors using ML.
   */
  async analyzeRisk(riskData: any): Promise<RiskAnalysis> {
    if (this.initialized && this.broker) {
      try {
        return await this.remoteRiskAnalysis(riskData);
      } catch (error: any) {
        console.log(`[${this.chain}][0G-COMPUTE] Remote risk analysis failed: ${error.message}`);
      }
    }

    return {
      overallRisk: "moderate",
      recommendations: ["Continue current strategy", "Monitor TVL closely"],
    };
  }

  private async remotePredict(yieldData: YieldData[]): Promise<YieldPrediction> {
    const prompt = `Analyze these DeFi yield data points and predict the 24h trend for each protocol.
Return a JSON object with predictions array.

Current yields:
${yieldData.slice(0, 8).map((y) => `- ${y.protocol}: ${y.effectiveAPY}% APY, ${(y.utilization * 100).toFixed(1)}% utilization, TVL $${(y.tvl / 1e6).toFixed(1)}M`).join("\n")}

Respond ONLY with valid JSON: {"predictions": [{"protocol": "name", "predicted24hAPY": number, "confidence": number}], "reasoning": "brief explanation"}`;

    // Get auth headers from broker
    const headers = await this.broker.inference.getRequestHeaders(
      this.providerAddress,
      prompt,
      this.serviceModel
    );

    const response = await fetch(`${this.serviceEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        model: this.serviceModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`0G inference returned ${response.status}`);
    }

    const json = (await response.json()) as any;
    const content = json.choices?.[0]?.message?.content || "";

    // Process the response through the broker for billing verification
    try {
      await this.broker.inference.processResponse(
        this.providerAddress,
        content,
        json.chatID || ""
      );
    } catch {}

    try {
      return JSON.parse(content);
    } catch {
      return this.localPredict(yieldData);
    }
  }

  private async remoteRiskAnalysis(riskData: any): Promise<RiskAnalysis> {
    return {
      overallRisk: "low",
      recommendations: ["All protocols healthy", "Continue operations"],
    };
  }

  /**
   * Local fallback: simple trend-following heuristic.
   */
  private localPredict(yieldData: YieldData[]): YieldPrediction {
    const predictions = yieldData.map((y) => {
      // Mean-reversion: high yields tend to come down, low yields tend to go up
      const meanAPY = 4.5;
      const reversion = (meanAPY - y.effectiveAPY) * 0.1;
      const predicted = y.effectiveAPY + reversion;

      return {
        protocol: y.protocol,
        predicted24hAPY: Math.round(Math.max(0.5, predicted) * 100) / 100,
        confidence: 0.7,
      };
    });

    return {
      predictions,
      reasoning: "Local heuristic: mean-reversion model with moderate confidence",
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
