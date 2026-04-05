// orchestrator/src/tee/TxSigner.ts

import { ethers } from "ethers";
import crypto from "crypto";
import { SignedTxBlob, CCTPMovement, ChainName } from "../../../shared/types";

// Exemple fictif des RPC et Chain IDs de testnet, devrait idéalement venir du fichier de config / shared
const RPC_URLS: Record<string, string> = {
  "BASE": "https://sepolia.base.org",
  "ARB": "https://sepolia-rollup.arbitrum.io/rpc",
  "ETH": "https://rpc.sepolia.org",
  "arc": "https://rpc.testnet.arc.network"
};

const CHAIN_IDS: Record<string, number> = {
  "BASE": 84532,
  "ARB": 421614,
  "ETH": 11155111,
  "arc": 5042002
};

export interface PaddedBlob {
  data: Buffer;
  size: number;
}

export class TxSigner {
  private enclaveSigner: ethers.Wallet;

  constructor() {
    const pk = process.env.TEE_PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";
    this.enclaveSigner = new ethers.Wallet(pk);
  }

  // Signe les TX d'execution (pour les agents sur les chains de destination)
  async signStrategyTx(
    chain: ChainName,
    strategyAddress: string,
    calldata: string
  ): Promise<SignedTxBlob> {
    const provider = new ethers.JsonRpcProvider(RPC_URLS[chain]);
    
    // Pour ne pas dependre du noeud dans un TEE et faire un blocage I/O risqué, 
    // on presumerait que le nonce et le gasPrice nous parviennent en input de l'agent.
    const tx = {
      to: strategyAddress,
      data: calldata,
      chainId: CHAIN_IDS[chain],
      gasLimit: 500000,
      value: 0
    };
    
    const wallet = this.enclaveSigner.connect(provider);
    const signedTx = await wallet.signTransaction(tx);
    
    return { chain, signedTx, type: "strategy_execution" };
  }

  // Signe les TX CCTP (pour les reallocations)
  async signCCTPTx(movement: CCTPMovement): Promise<SignedTxBlob> {
    // 1. Appel du depositForBurn sur la chain native
    // Dans l'avenir on recuperera l'ABI du TokenMessenger et on encodera la donnée
    const calldata = "0x"; // Dummy data for simulation
    
    const provider = new ethers.JsonRpcProvider(RPC_URLS[movement.from as string]);
    const wallet = this.enclaveSigner.connect(provider);
    
    const tx = {
      to: ethers.ZeroAddress, // Adresse CCTP Token Messenger
      data: calldata,
      chainId: CHAIN_IDS[movement.from as string] || 1,
    };
    
    const signedTx = await wallet.signTransaction(tx);

    return { 
      chain: movement.from === "arc" ? "ETH" /* Replace with generic base fallback */ : movement.from as ChainName, 
      signedTx, 
      type: "cctp_bridge" 
    };
  }

  // Messages uniformes : meme taille pour TOUS les agents
  // Un agent rejete recoit un blob de meme taille qu'un agent approuve
  // Impossible de distinguer approve vs rejete cryptographiquement via la taille
  padToUniformSize(blob: SignedTxBlob): PaddedBlob {
    const TARGET_SIZE = 4096; // bytes
    const blobBuffer = Buffer.from(JSON.stringify(blob));
    
    if (blobBuffer.length > TARGET_SIZE) {
        throw new Error("TxBlob size exceeds padding target size");
    }

    const padding = crypto.randomBytes(TARGET_SIZE - blobBuffer.length);
    return { 
        data: Buffer.concat([blobBuffer, padding]), 
        size: TARGET_SIZE 
    };
  }
}
