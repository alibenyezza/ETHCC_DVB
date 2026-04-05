import { ethers } from "ethers";
import { ChainName, SignedTxBlob } from "../../core/types";
import { getStrategyAddress, getCCTPBridgeAddress } from "../../integrations/ContractRegistry";

// IStrategy ABI (from Adrian's contracts)
const STRATEGY_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external returns (uint256)",
  "function withdrawAll() external returns (uint256)",
  "function balanceOf() external view returns (uint256)",
  "function estimatedYield() external view returns (uint256)",
  "function protocolName() external view returns (string)",
];

/**
 * Receives pre-signed transaction blobs from the TEE and broadcasts them.
 * Can also interact directly with Adrian's strategy contracts.
 */
export class TxBroadcaster {
  private provider: ethers.JsonRpcProvider;
  private chain: ChainName;

  constructor(chain: string, provider: ethers.JsonRpcProvider) {
    this.chain = chain as ChainName;
    this.provider = provider;
  }

  /**
   * Execute a batch of pre-signed transactions from the TEE.
   * Broadcasts each TX with a random delay to prevent correlation.
   */
  async execute(txBlobs: SignedTxBlob[]): Promise<string[]> {
    const hashes: string[] = [];

    for (const blob of txBlobs) {
      if (blob.type === "noop") {
        console.log(`[${this.chain}][EXEC] Received noop — skipping`);
        continue;
      }

      try {
        // Random delay 5-30 seconds (reduced from 2-15 min for MVP)
        const delay = 5000 + Math.random() * 25000;
        console.log(
          `[${this.chain}][EXEC] Waiting ${(delay / 1000).toFixed(1)}s before broadcasting...`
        );
        await sleep(delay);

        const txResponse = await this.provider.broadcastTransaction(blob.signedTx);
        console.log(`[${this.chain}][EXEC] TX sent: ${txResponse.hash}`);

        const receipt = await txResponse.wait();
        if (receipt) {
          console.log(
            `[${this.chain}][EXEC] TX confirmed: ${receipt.hash} (block ${receipt.blockNumber})`
          );
          hashes.push(receipt.hash);
        }
      } catch (error: any) {
        console.error(
          `[${this.chain}][EXEC] TX failed: ${error.message || error}`
        );
      }
    }

    return hashes;
  }

  /**
   * Read the current balance from a deployed strategy contract.
   */
  async readStrategyBalance(protocol: string): Promise<number | null> {
    const addr = getStrategyAddress(this.chain, protocol);
    if (!addr) return null;

    try {
      const contract = new ethers.Contract(addr, STRATEGY_ABI, this.provider);
      const balance = await contract.balanceOf();
      return Number(ethers.formatUnits(balance, 6)); // USDC = 6 decimals
    } catch (error: any) {
      console.log(`[${this.chain}][EXEC] Cannot read strategy ${protocol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Read the estimated yield from a deployed strategy contract.
   */
  async readStrategyYield(protocol: string): Promise<number | null> {
    const addr = getStrategyAddress(this.chain, protocol);
    if (!addr) return null;

    try {
      const contract = new ethers.Contract(addr, STRATEGY_ABI, this.provider);
      const yieldBps = await contract.estimatedYield();
      return Number(yieldBps) / 100; // bps -> percentage
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Get the deployed strategy address for a protocol (for logging).
   */
  getStrategyAddress(protocol: string): string | null {
    return getStrategyAddress(this.chain, protocol);
  }

  /**
   * Broadcast a single raw transaction (for direct agent operations).
   */
  async broadcastRaw(signedTx: string): Promise<string | null> {
    try {
      const txResponse = await this.provider.broadcastTransaction(signedTx);
      const receipt = await txResponse.wait();
      return receipt?.hash || null;
    } catch (error: any) {
      console.error(`[${this.chain}][EXEC] Raw TX failed: ${error.message}`);
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
