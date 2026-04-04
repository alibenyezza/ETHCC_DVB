import { ethers } from "ethers";
import { SignedTxBlob } from "../../core/types";

/**
 * Receives pre-signed transaction blobs from the TEE and broadcasts them.
 * Adds random delay between transactions for anti-correlation (MEV protection).
 */
export class TxBroadcaster {
  private provider: ethers.JsonRpcProvider;
  private chain: string;

  constructor(chain: string, provider: ethers.JsonRpcProvider) {
    this.chain = chain;
    this.provider = provider;
  }

  /**
   * Execute a batch of pre-signed transactions.
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
