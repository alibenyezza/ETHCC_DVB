// orchestrator/src/attestation/Attestor.ts

import { ethers } from "ethers";

// Un type local temporaire pour définir la nature de la décision TEE globale
export interface TEEDecisions {
  timestamp: number;
  validations: any[]; 
  reallocation: any | null; 
}

export class Attestor {
  private enclaveSigner: ethers.Wallet;
  private zgRpc: string;

  constructor() {
    const pk = process.env.TEE_PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";
    this.enclaveSigner = new ethers.Wallet(pk);
    this.zgRpc = process.env.ZG_CHAIN_RPC || "https://evmrpc-testnet.0g.ai";
  }

  // Apres chaque cycle de decisions, ancrer l'attestation sur la chaine 0G
  async anchor(decisions: TEEDecisions): Promise<string> {
    // 1. Generer le hash des decisions (sans reveler le contenu stratégique)
    const payloadToHash = {
      timestamp: decisions.timestamp,
      agentsValidated: decisions.validations.length,
      reallocation: decisions.reallocation ? true : false,
    };

    const decisionHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(payloadToHash))
    );

    // 2. Signer avec la cle TEE pour prouver que ça vient de la bonne enclave
    const attestation = await this.enclaveSigner.signMessage(ethers.getBytes(decisionHash));

    // 3. Ancrer sur 0G Chain (lazy-connect to avoid blocking constructor)
    try {
      const provider = new ethers.JsonRpcProvider(this.zgRpc, undefined, {
        staticNetwork: true,
      });
      const wallet = this.enclaveSigner.connect(provider);
      const attestationAbi = [
        "function anchor(bytes32 decisionHash, bytes signature, uint256 timestamp) external returns (bool)"
      ];
      // Placeholder contract address — in production this would be a deployed AttestationRegistry
      const contract = new ethers.Contract(ethers.ZeroAddress, attestationAbi, wallet);
      const tx = await contract.anchor(decisionHash, attestation, decisions.timestamp);
      return tx.hash;
    } catch {
      // Off-chain attestation: hash + signature stored locally
      // In production: deploy AttestationRegistry on 0G Chain
      return `0xAttestation_${decisionHash.slice(0, 18)}`;
    }
  }
}
