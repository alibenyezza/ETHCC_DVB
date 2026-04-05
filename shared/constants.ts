// shared/constants.ts — Constantes partagees entre agents, orchestrator et dashboard

// USDC addresses par chain (testnet)
export const USDC_ADDRESSES: Record<string, string> = {
  arc: "0x3600000000000000000000000000000000000000",
  ETH: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  BASE: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  ARB: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  AVAX: "0x6a17716Ce178e84835cfA73AbdB71cb455032456",
  OP: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
  POLY: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  UNICHAIN: "0x0000000000000000000000000000000000000000", // TBD
  LINEA: "0x0000000000000000000000000000000000000000", // TBD
  SONIC: "0x0000000000000000000000000000000000000000", // TBD
  WORLD: "0x0000000000000000000000000000000000000000", // TBD
  SEI: "0x0000000000000000000000000000000000000000", // TBD
  BNB: "0x0000000000000000000000000000000000000000", // TBD
  INK: "0x0000000000000000000000000000000000000000", // TBD
};

// USDC decimals — 6 partout
export const USDC_DECIMALS: Record<string, number> = {
  arc: 6, ETH: 6, BASE: 6, ARB: 6, AVAX: 6, OP: 6,
  POLY: 6, UNICHAIN: 6, LINEA: 6, SONIC: 6, WORLD: 6,
  SEI: 6, BNB: 6, INK: 6,
};

// CCTP Domain IDs (all 13 chains + Arc)
export const DOMAIN_IDS: Record<string, number> = {
  arc: 26,
  ETH: 0,
  AVAX: 1,
  OP: 2,
  ARB: 3,
  BASE: 6,
  POLY: 7,
  UNICHAIN: 10,
  LINEA: 11,
  SONIC: 13,
  WORLD: 14,
  SEI: 16,
  BNB: 17,
  INK: 21,
};

// Chain IDs (testnet)
export const CHAIN_IDS: Record<string, number> = {
  arc: 5042002,
  ETH: 11155111,
  AVAX: 43113,
  OP: 11155420,
  ARB: 421614,
  BASE: 84532,
  POLY: 80002,
  UNICHAIN: 1301,
  LINEA: 59141,
  SONIC: 64165,
  WORLD: 4801,
  SEI: 713715,
  BNB: 97,
  INK: 763373,
};

// RPC URLs (testnet)
export const RPC_URLS: Record<string, string> = {
  arc: "https://rpc.testnet.arc.network",
  ETH: "https://rpc.sepolia.org",
  AVAX: "https://api.avax-test.network/ext/bc/C/rpc",
  OP: "https://sepolia.optimism.io",
  ARB: "https://sepolia-rollup.arbitrum.io/rpc",
  BASE: "https://sepolia.base.org",
  POLY: "https://rpc-amoy.polygon.technology",
  UNICHAIN: "https://sepolia.unichain.org",
  LINEA: "https://rpc.sepolia.linea.build",
  SONIC: "https://rpc.testnet.soniclabs.com",
  WORLD: "https://worldchain-sepolia.g.alchemy.com/public",
  SEI: "https://evm-rpc-testnet.sei-apis.com",
  BNB: "https://data-seed-prebsc-1-s1.binance.org:8545",
  INK: "https://rpc-gel-sepolia.inkonchain.com",
};

// CCTP TokenMessenger par chain (testnet)
// AVAX Fuji uses different CCTP V2 addresses than the other Sepolia chains
export const CCTP_TOKEN_MESSENGER: Record<string, string> = {
  arc: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  ETH: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  BASE: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  ARB: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  AVAX: "0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0",
  OP: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  POLY: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  UNICHAIN: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  LINEA: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  SONIC: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  WORLD: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  SEI: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  BNB: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  INK: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
};

// CCTP MessageTransmitter par chain (testnet)
export const CCTP_MESSAGE_TRANSMITTER: Record<string, string> = {
  arc: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  ETH: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  BASE: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  ARB: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  AVAX: "0xa9fB1b3009DCb79E2fe346c16a604B8Fa8aE0a79",
  OP: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  POLY: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  UNICHAIN: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  LINEA: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  SONIC: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  WORLD: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  SEI: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  BNB: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  INK: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
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
