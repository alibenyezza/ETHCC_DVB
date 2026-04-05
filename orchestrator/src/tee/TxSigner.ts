// orchestrator/src/tee/TxSigner.ts

import { ethers } from "ethers";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { SignedTxBlob, CCTPMovement, ChainName, Position } from "../../../shared/types";
import { RPC_URLS, CHAIN_IDS, USDC_ADDRESSES, CCTP_TOKEN_MESSENGER, DOMAIN_IDS } from "../../../shared/constants";

// ═══════════════════════════════════════════════════════════
// ABIs — IStrategy + CCTPBridge (depositForBurn)
// ═══════════════════════════════════════════════════════════

const STRATEGY_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external returns (uint256)",
  "function withdrawAll() external returns (uint256)",
  "function balanceOf() external view returns (uint256)",
  "function estimatedYield() external view returns (uint256)",
  "function protocolName() external view returns (string)",
];

const CCTP_BRIDGE_ABI = [
  "function bridgeUSDC(uint32 destinationDomain, bytes32 mintRecipient, uint256 amount) external",
];

// Direct depositForBurn on TokenMessenger (fallback if no bridge contract)
const TOKEN_MESSENGER_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64)",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export interface PaddedBlob {
  data: Buffer;
  size: number;
}

// Load deployments.json for contract addresses
interface DeploymentData {
  strategies?: Record<string, string>;
  cctpBridge?: string;
  cctpTokenMessenger?: string;
  usdc_circle?: string;
}

function loadDeployments(): Record<string, DeploymentData> {
  try {
    const deploymentsPath = path.resolve(__dirname, "../../../shared/deployments.json");
    return JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  } catch {
    return {};
  }
}

const CHAIN_TO_DEPLOYMENT_KEY: Partial<Record<ChainName, string>> = {
  ETH: "eth_sepolia",
  BASE: "base_sepolia",
  ARB: "arb_sepolia",
  OP: "op_sepolia",
  AVAX: "avax_fuji",
};

export class TxSigner {
  private enclaveSigner: ethers.Wallet;
  private deployments: Record<string, DeploymentData>;
  private providerCache: Map<string, ethers.JsonRpcProvider> = new Map();
  // Track nonces per chain to handle multiple TXs in the same cycle
  private nonceOffsets: Map<string, number> = new Map();

  constructor() {
    const pk = process.env.TEE_PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";
    this.enclaveSigner = new ethers.Wallet(pk);
    this.deployments = loadDeployments();
  }

  /**
   * Get or create a provider for a chain.
   */
  private getProvider(chain: ChainName | string): ethers.JsonRpcProvider {
    const key = chain.toString();
    if (!this.providerCache.has(key)) {
      const rpc = RPC_URLS[key];
      if (!rpc) throw new Error(`No RPC URL for chain ${key}`);
      this.providerCache.set(key, new ethers.JsonRpcProvider(rpc, undefined, { staticNetwork: true }));
    }
    return this.providerCache.get(key)!;
  }

  /**
   * Fetch real nonce and gas parameters from the chain.
   * Handles multiple TXs per cycle by incrementing nonce offset.
   * Times out after 5s and falls back to defaults.
   */
  private async getTxParams(chain: ChainName | string): Promise<{ nonce: number; gasPrice: bigint }> {
    const key = chain.toString();
    const offset = this.nonceOffsets.get(key) || 0;
    this.nonceOffsets.set(key, offset + 1);

    try {
      const provider = this.getProvider(chain);
      // Race against a 5s timeout to avoid hanging on unresponsive RPCs
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 5000)
      );

      const [baseNonce, feeData] = await Promise.race([
        Promise.all([
          provider.getTransactionCount(this.enclaveSigner.address, "pending"),
          provider.getFeeData(),
        ]),
        timeout,
      ]) as [number, ethers.FeeData];

      const gasPrice = feeData.gasPrice || 2000000000n;
      return { nonce: baseNonce + offset, gasPrice };
    } catch (error: any) {
      console.log(`[TX] RPC unavailable for ${chain}: ${error.message} — using nonce offset ${offset}`);
      return { nonce: offset, gasPrice: 2000000000n };
    }
  }

  /**
   * Reset nonce offsets at the start of each cycle.
   */
  resetNonceOffsets(): void {
    this.nonceOffsets.clear();
  }

  /**
   * Get the deployed strategy address for a protocol on a chain.
   */
  private getStrategyAddress(chain: ChainName, protocol: string): string | null {
    const key = CHAIN_TO_DEPLOYMENT_KEY[chain];
    if (!key || !this.deployments[key]) return null;
    return this.deployments[key].strategies?.[protocol] || null;
  }

  /**
   * Get the CCTP bridge address for a chain.
   */
  private getCCTPBridgeAddress(chain: ChainName | "arc"): string | null {
    if (chain === "arc") return this.deployments.arc_testnet?.cctpBridge || null;
    const key = CHAIN_TO_DEPLOYMENT_KEY[chain as ChainName];
    if (!key || !this.deployments[key]) return null;
    return this.deployments[key].cctpBridge || null;
  }

  /**
   * Get the USDC token address for a chain from deployments.
   */
  private getUSDCAddress(chain: ChainName): string | null {
    const key = CHAIN_TO_DEPLOYMENT_KEY[chain];
    if (!key || !this.deployments[key]) return USDC_ADDRESSES[chain] || null;
    return this.deployments[key].usdc_circle || USDC_ADDRESSES[chain] || null;
  }

  /**
   * Sign a USDC approve transaction (must precede deposit).
   */
  private async signApproveTx(
    chain: ChainName,
    spender: string,
    amount: bigint
  ): Promise<SignedTxBlob | null> {
    const usdcAddress = this.getUSDCAddress(chain);
    if (!usdcAddress || usdcAddress === ethers.ZeroAddress) {
      console.log(`[TX] No USDC address for ${chain} — skipping approve`);
      return null;
    }

    const iface = new ethers.Interface(USDC_ABI);
    const calldata = iface.encodeFunctionData("approve", [spender, amount]);
    const { nonce, gasPrice } = await this.getTxParams(chain);

    const tx = {
      to: usdcAddress,
      data: calldata,
      chainId: CHAIN_IDS[chain],
      gasLimit: 100000,
      value: 0,
      nonce,
      gasPrice,
    };

    const signedTx = await this.enclaveSigner.signTransaction(tx);
    console.log(`[TX] Signed USDC approve for ${chain}: spender=${spender}, amount=${amount.toString()}, nonce=${nonce}`);
    return { chain, signedTx, type: "strategy_execution" };
  }

  /**
   * Sign strategy transactions for a proposal position.
   * For deposits: returns [approve TX, deposit TX].
   * For withdrawals: returns [withdraw TX].
   */
  async signStrategyTxFromProposal(
    chain: ChainName,
    position: Position
  ): Promise<SignedTxBlob[]> {
    // Map protocol name to deployment key (e.g., "Aave V3" -> "aave")
    const protocolKey = position.protocol.toLowerCase().replace(/\s+v\d+/i, "").replace(/\s+/g, "");
    const strategyAddress = this.getStrategyAddress(chain, protocolKey);

    if (!strategyAddress) {
      console.log(`[TX] No strategy contract for ${position.protocol} on ${chain}`);
      return [];
    }

    const iface = new ethers.Interface(STRATEGY_ABI);
    const amount = ethers.parseUnits("1000", 6); // USDC amount (6 decimals)
    const blobs: SignedTxBlob[] = [];

    if (position.action === "deposit") {
      // 1. Approve USDC spend by strategy contract
      const approveBlob = await this.signApproveTx(chain, strategyAddress, amount);
      if (approveBlob) blobs.push(approveBlob);

      // 2. Deposit into strategy
      const calldata = iface.encodeFunctionData("deposit", [amount]);
      const depositBlob = await this.signStrategyTx(chain, strategyAddress, calldata);
      blobs.push(depositBlob);
    } else if (position.action === "withdraw") {
      const calldata = iface.encodeFunctionData("withdraw", [amount]);
      const withdrawBlob = await this.signStrategyTx(chain, strategyAddress, calldata);
      blobs.push(withdrawBlob);
    }

    return blobs;
  }

  /**
   * Sign a raw strategy transaction with explicit calldata.
   * Fetches real nonce and gas price from the chain RPC.
   */
  async signStrategyTx(
    chain: ChainName,
    strategyAddress: string,
    calldata: string
  ): Promise<SignedTxBlob> {
    const { nonce, gasPrice } = await this.getTxParams(chain);

    const tx = {
      to: strategyAddress,
      data: calldata,
      chainId: CHAIN_IDS[chain],
      gasLimit: 500000,
      value: 0,
      nonce,
      gasPrice,
    };

    const signedTx = await this.enclaveSigner.signTransaction(tx);
    console.log(`[TX] Signed strategy TX for ${chain}: nonce=${nonce}, gas=${gasPrice.toString()}`);
    return { chain, signedTx, type: "strategy_execution" };
  }

  /**
   * Sign a CCTP bridge transaction for cross-chain USDC movement.
   * Uses the CCTPBridge contract (Adrian's) which wraps depositForBurn.
   */
  async signCCTPTx(movement: CCTPMovement): Promise<SignedTxBlob> {
    const fromChain = movement.from as string;
    const bridgeAddress = this.getCCTPBridgeAddress(fromChain as ChainName | "arc");
    const signerAddress = this.enclaveSigner.address;

    let calldata: string;
    let toAddress: string;

    if (bridgeAddress) {
      // Use Adrian's CCTPBridge contract (handles approve + depositForBurn internally)
      const iface = new ethers.Interface(CCTP_BRIDGE_ABI);
      const recipientBytes32 = ethers.zeroPadValue(signerAddress, 32);
      const amount = ethers.parseUnits(movement.amount.toString(), 6);
      calldata = iface.encodeFunctionData("bridgeUSDC", [
        movement.domainTo,
        recipientBytes32,
        amount,
      ]);
      toAddress = bridgeAddress;
    } else {
      // Fallback: direct depositForBurn on TokenMessenger
      const tokenMessenger = CCTP_TOKEN_MESSENGER[fromChain];
      if (!tokenMessenger) {
        console.log(`[TX] No CCTP config for chain ${fromChain} — skipping`);
        return { chain: (fromChain === "arc" ? "ETH" : fromChain) as ChainName, signedTx: "0x", type: "cctp_bridge" };
      }
      const iface = new ethers.Interface(TOKEN_MESSENGER_ABI);
      const recipientBytes32 = ethers.zeroPadValue(signerAddress, 32);
      const amount = ethers.parseUnits(movement.amount.toString(), 6);
      const burnToken = USDC_ADDRESSES[fromChain];
      calldata = iface.encodeFunctionData("depositForBurn", [
        amount,
        movement.domainTo,
        recipientBytes32,
        burnToken,
        ethers.ZeroHash,
        0,
        1000,
      ]);
      toAddress = tokenMessenger;
    }

    const resolvedChain = fromChain === "arc" ? "ETH" : fromChain;
    const { nonce, gasPrice } = await this.getTxParams(resolvedChain);

    const tx = {
      to: toAddress,
      data: calldata,
      chainId: CHAIN_IDS[fromChain] || 1,
      gasLimit: 300000,
      value: 0,
      nonce,
      gasPrice,
    };

    const signedTx = await this.enclaveSigner.signTransaction(tx);
    console.log(`[TX] Signed CCTP TX from ${fromChain}: nonce=${nonce}, gas=${gasPrice.toString()}`);

    return {
      chain: resolvedChain as ChainName,
      signedTx,
      type: "cctp_bridge",
    };
  }

  /**
   * Pad all TEE response blobs to uniform size.
   * Approved and rejected responses are indistinguishable by size.
   */
  padToUniformSize(blob: SignedTxBlob): PaddedBlob {
    const TARGET_SIZE = 4096; // bytes
    const blobBuffer = Buffer.from(JSON.stringify(blob));

    if (blobBuffer.length > TARGET_SIZE) {
      throw new Error("TxBlob size exceeds padding target size");
    }

    const padding = crypto.randomBytes(TARGET_SIZE - blobBuffer.length);
    return {
      data: Buffer.concat([blobBuffer, padding]),
      size: TARGET_SIZE,
    };
  }
}
