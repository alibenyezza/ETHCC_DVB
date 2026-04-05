// shared/constants.ts — Constantes partagees entre agents, orchestrator et dashboard

// USDC addresses par chain (testnet)
export const USDC_ADDRESSES: Record<string, string> = {
  arc: "0x3600000000000000000000000000000000000000",
  ETH: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  BASE: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  ARB: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

// USDC decimals — 6 partout (y compris Arc, verifie on-chain)
export const USDC_DECIMALS: Record<string, number> = {
  arc: 6,
  ETH: 6,
  BASE: 6,
  ARB: 6,
};

// CCTP Domain IDs
export const DOMAIN_IDS: Record<string, number> = {
  arc: 26,
  ETH: 0,
  BASE: 6,
  ARB: 3,
};

// Chain IDs (testnet)
export const CHAIN_IDS: Record<string, number> = {
  arc: 5042002,
  ETH: 11155111,
  BASE: 84532,
  ARB: 421614,
};

// RPC URLs
export const RPC_URLS: Record<string, string> = {
  arc: "https://rpc.testnet.arc.network",
  ETH: "https://rpc.sepolia.org",
  BASE: "https://sepolia.base.org",
  ARB: "https://sepolia-rollup.arbitrum.io/rpc",
};

// CCTP TokenMessenger par chain (testnet)
export const CCTP_TOKEN_MESSENGER: Record<string, string> = {
  arc: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  ETH: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  BASE: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  ARB: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
};

// CCTP MessageTransmitter par chain (testnet)
export const CCTP_MESSAGE_TRANSMITTER: Record<string, string> = {
  arc: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  ETH: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  BASE: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  ARB: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
};

// Deployed contract addresses (Arc Testnet)
export const VAULT_ADDRESS = "0xE5cD5a7B782800e833dDe8648675e693CBe04ab6";
export const ARCMIND_TOKEN = VAULT_ADDRESS; // vault IS the token
export const AGENT_PAYMASTER = "0x8a2A55F62dF6f22e96525Da67c83F6B9caB85898";
export const CCTP_BRIDGE_ARC = "0xf8a2d17B7ba46f9Fc0AD5e19947AdD65e4Efdc4E";

// Security thresholds
export const SAFETY_THRESHOLD = 0.7;
export const MAX_PROTOCOL_PCT = 40;
export const MAX_CHAIN_PCT = 50;
export const BUFFER_PCT = 10;
export const MIN_REALLOC_GAIN_MULTIPLIER = 2;
export const REALLOC_INTERVAL_HOURS = 6;
export const AGENT_CYCLE_SECONDS = 30;
