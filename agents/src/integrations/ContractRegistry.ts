import * as fs from "fs";
import * as path from "path";
import { ChainName } from "../core/types";

/**
 * Reads deployed contract addresses from Adrian's deployments.json.
 * This bridges the agents with the on-chain strategy contracts.
 */

interface DeploymentInfo {
  chainId: number;
  domainId: number;
  rpc: string;
  strategies?: Record<string, string>;
  cctpBridge?: string;
  usdc_circle?: string;
  protocols?: Record<string, any>;
}

// Map our chain names to deployment keys
const CHAIN_TO_DEPLOYMENT_KEY: Partial<Record<ChainName, string>> = {
  ETH: "eth_sepolia",
  BASE: "base_sepolia",
  ARB: "arb_sepolia",
  OP: "op_sepolia",
  AVAX: "avax_fuji",
};

let deployments: Record<string, any> | null = null;

function loadDeployments(): Record<string, any> {
  if (deployments) return deployments;

  const deploymentsPath = path.resolve(__dirname, "../../../shared/deployments.json");
  try {
    const raw = fs.readFileSync(deploymentsPath, "utf-8");
    deployments = JSON.parse(raw);
    return deployments!;
  } catch {
    console.log("[CONTRACTS] deployments.json not found — using defaults");
    return {};
  }
}

/**
 * Get the deployed strategy contract address for a protocol on a chain.
 * Returns null if no deployment exists.
 */
export function getStrategyAddress(chain: ChainName, protocol: string): string | null {
  const data = loadDeployments();
  const key = CHAIN_TO_DEPLOYMENT_KEY[chain];
  if (!key || !data[key]) return null;

  const deployment = data[key] as DeploymentInfo;
  // Check strategies map (e.g., { aave: "0x...", morpho: "0x..." })
  if (deployment.strategies?.[protocol]) {
    return deployment.strategies[protocol];
  }
  return null;
}

/**
 * Get the CCTP bridge address for a chain.
 */
export function getCCTPBridgeAddress(chain: ChainName): string | null {
  const data = loadDeployments();
  const key = CHAIN_TO_DEPLOYMENT_KEY[chain];
  if (!key || !data[key]) return null;
  return (data[key] as DeploymentInfo).cctpBridge || null;
}

/**
 * Get the USDC token address for a chain.
 */
export function getUSDCAddress(chain: ChainName): string | null {
  const data = loadDeployments();
  const key = CHAIN_TO_DEPLOYMENT_KEY[chain];
  if (!key || !data[key]) return null;
  return (data[key] as DeploymentInfo).usdc_circle || null;
}

/**
 * Get protocol-specific contract addresses (e.g., Aave pool, aToken, etc.).
 */
export function getProtocolContracts(chain: ChainName, protocol: string): Record<string, string> | null {
  const data = loadDeployments();
  const key = CHAIN_TO_DEPLOYMENT_KEY[chain];
  if (!key || !data[key]) return null;

  const deployment = data[key] as any;
  if (deployment.protocols?.[protocol]) {
    return deployment.protocols[protocol];
  }
  return null;
}

/**
 * Get the Arc testnet vault address.
 */
export function getVaultAddress(): string {
  const data = loadDeployments();
  return data.arc_testnet?.vault || "0xE5cD5a7B782800e833dDe8648675e693CBe04ab6";
}

/**
 * Get the Agent Paymaster address on Arc.
 */
export function getPaymasterAddress(): string {
  const data = loadDeployments();
  return data.arc_testnet?.agentPaymaster || "0x8a2A55F62dF6f22e96525Da67c83F6B9caB85898";
}

/**
 * Get all deployment info for logging.
 */
export function getDeploymentSummary(): string {
  const data = loadDeployments();
  const chains = Object.keys(data).filter((k) => !k.startsWith("_"));
  return chains
    .map((k) => {
      const d = data[k];
      const stratCount = d.strategies ? Object.keys(d.strategies).length : 0;
      return `${k}: ${stratCount} strategies`;
    })
    .join(" | ");
}
