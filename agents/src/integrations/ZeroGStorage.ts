import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

const ZG_RPC = "https://evmrpc-testnet.0g.ai";
const ZG_INDEXER = "https://indexer-storage-testnet-turbo.0g.ai";

/**
 * Integration with 0G Storage for persistent agent memory.
 *
 * Stores yield histories, performance logs, and fine-tuned model data
 * on the decentralized 0G Storage network.
 *
 * Falls back to local file storage if 0G is unavailable.
 */
export class ZeroGStorage {
  private privateKey: string;
  private rpc: string;
  private indexerRpc: string;
  private chain: string;
  private initialized: boolean = false;
  private indexer: any = null;
  private signer: ethers.Wallet | null = null;

  // Local cache: key -> rootHash (for retrieval)
  private hashIndex: Map<string, string> = new Map();
  // Local fallback directory
  private localDir: string;

  constructor(
    chain: string,
    privateKey: string,
    rpc: string = ZG_RPC,
    indexerRpc: string = ZG_INDEXER
  ) {
    this.chain = chain;
    this.privateKey = privateKey;
    this.rpc = rpc;
    this.indexerRpc = indexerRpc;
    this.localDir = path.join(process.cwd(), ".storage", chain.toLowerCase());
  }

  /**
   * Initialize 0G Storage connection.
   */
  async init(): Promise<boolean> {
    // Always ensure local fallback directory exists
    if (!fs.existsSync(this.localDir)) {
      fs.mkdirSync(this.localDir, { recursive: true });
    }

    // Load hash index from local cache
    this.loadHashIndex();

    if (!this.privateKey) {
      console.log(`[${this.chain}][0G-STORAGE] No private key — using local storage`);
      return false;
    }

    try {
      const { Indexer } = await import("@0gfoundation/0g-ts-sdk");

      const provider = new ethers.JsonRpcProvider(this.rpc);
      this.signer = new ethers.Wallet(this.privateKey, provider);
      this.indexer = new Indexer(this.indexerRpc);

      this.initialized = true;
      console.log(`[${this.chain}][0G-STORAGE] Initialized with indexer ${this.indexerRpc}`);
      return true;
    } catch (error: any) {
      console.log(
        `[${this.chain}][0G-STORAGE] Init failed: ${error.message} — using local storage`
      );
      return false;
    }
  }

  /**
   * Store data under a key.
   * Uploads to 0G Storage if available, always saves locally as backup.
   */
  async store(key: string, data: any): Promise<string | null> {
    const jsonStr = JSON.stringify(data);

    // Always save locally
    this.saveLocal(key, jsonStr);

    if (this.initialized && this.indexer && this.signer) {
      try {
        const { MemData } = await import("@0gfoundation/0g-ts-sdk");

        const encoded = new TextEncoder().encode(jsonStr);
        const memData = new MemData(encoded);

        const [tree, treeErr] = await memData.merkleTree();
        if (treeErr) {
          throw new Error(`Merkle tree error: ${treeErr}`);
        }

        const [tx, uploadErr] = await this.indexer.upload(memData, this.rpc, this.signer);
        if (uploadErr) {
          throw new Error(`Upload error: ${uploadErr}`);
        }

        // Store rootHash for later retrieval
        const rootHash = tree!.rootHash() as string;
        if (!rootHash) throw new Error("Failed to compute root hash");
        this.hashIndex.set(key, rootHash);
        this.saveHashIndex();

        console.log(`[${this.chain}][0G-STORAGE] Stored "${key}" — hash: ${rootHash}`);
        return rootHash;
      } catch (error: any) {
        console.log(`[${this.chain}][0G-STORAGE] Upload failed: ${error.message} — saved locally`);
      }
    }

    return null;
  }

  /**
   * Retrieve data by key.
   * Tries 0G Storage first, falls back to local.
   */
  async retrieve(key: string): Promise<any | null> {
    // Try local first (faster)
    const localData = this.loadLocal(key);

    if (this.initialized && this.indexer) {
      const rootHash = this.hashIndex.get(key);
      if (rootHash) {
        try {
          const tmpPath = path.join(this.localDir, `_tmp_${key}`);
          const err = await this.indexer.download(rootHash, tmpPath, true);
          if (!err) {
            const content = fs.readFileSync(tmpPath, "utf-8");
            fs.unlinkSync(tmpPath); // Clean up temp file
            console.log(`[${this.chain}][0G-STORAGE] Retrieved "${key}" from 0G`);
            return JSON.parse(content);
          }
        } catch (error: any) {
          console.log(`[${this.chain}][0G-STORAGE] Download failed: ${error.message}`);
        }
      }
    }

    return localData;
  }

  // --- Convenience methods ---

  async storeYieldHistory(data: any): Promise<void> {
    await this.store(`yield_history_${this.chain}`, data);
  }

  async retrieveYieldHistory(): Promise<any | null> {
    return this.retrieve(`yield_history_${this.chain}`);
  }

  async storePerformanceLog(data: any): Promise<void> {
    await this.store(`performance_${this.chain}`, data);
  }

  async retrievePerformanceLog(): Promise<any | null> {
    return this.retrieve(`performance_${this.chain}`);
  }

  // --- Local fallback ---

  private saveLocal(key: string, data: string): void {
    const filePath = path.join(this.localDir, `${this.sanitizeKey(key)}.json`);
    fs.writeFileSync(filePath, data, "utf-8");
  }

  private loadLocal(key: string): any | null {
    const filePath = path.join(this.localDir, `${this.sanitizeKey(key)}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
      }
    } catch {}
    return null;
  }

  private saveHashIndex(): void {
    const indexPath = path.join(this.localDir, "_hash_index.json");
    const obj = Object.fromEntries(this.hashIndex);
    fs.writeFileSync(indexPath, JSON.stringify(obj, null, 2), "utf-8");
  }

  private loadHashIndex(): void {
    const indexPath = path.join(this.localDir, "_hash_index.json");
    try {
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, "utf-8");
        const obj = JSON.parse(content);
        this.hashIndex = new Map(Object.entries(obj));
      }
    } catch {}
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
