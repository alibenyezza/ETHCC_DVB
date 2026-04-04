import * as dotenv from "dotenv";
dotenv.config();

import { Agent } from "./core/Agent";
import { AgentConfig } from "./core/AgentConfig";
import { createEthereumConfig } from "./chains/ethereum.config";
import { createAvalancheConfig } from "./chains/avalanche.config";
import { createOptimismConfig } from "./chains/optimism.config";
import { createArbitrumConfig } from "./chains/arbitrum.config";
import { createBaseConfig } from "./chains/base.config";
import { createPolygonConfig } from "./chains/polygon.config";
import { createUnichainConfig } from "./chains/unichain.config";
import { createLineaConfig } from "./chains/linea.config";
import { createSonicConfig } from "./chains/sonic.config";
import { createWorldChainConfig } from "./chains/worldchain.config";
import { createSeiConfig } from "./chains/sei.config";
import { createBnbConfig } from "./chains/bnb.config";
import { createInkConfig } from "./chains/ink.config";

// All 13 CCTP-compatible chains with DeFi yield protocols
const CHAIN_CONFIGS: Record<string, () => AgentConfig> = {
  eth:       createEthereumConfig,     // Domain 0  — Ethereum
  avax:      createAvalancheConfig,    // Domain 1  — Avalanche
  op:        createOptimismConfig,     // Domain 2  — Optimism
  arb:       createArbitrumConfig,     // Domain 3  — Arbitrum
  base:      createBaseConfig,         // Domain 6  — Base
  poly:      createPolygonConfig,      // Domain 7  — Polygon PoS
  unichain:  createUnichainConfig,     // Domain 10 — Unichain
  linea:     createLineaConfig,        // Domain 11 — Linea
  sonic:     createSonicConfig,        // Domain 13 — Sonic
  world:     createWorldChainConfig,   // Domain 14 — World Chain
  sei:       createSeiConfig,          // Domain 16 — Sei
  bnb:       createBnbConfig,          // Domain 17 — BNB Smart Chain
  ink:       createInkConfig,          // Domain 21 — Ink
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ArcMind — Autonomous AI Agents for Cross-Chain DeFi");
  console.log(`  ${Object.keys(CHAIN_CONFIGS).length} chains supported via Circle CCTP`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Parse command line args
  const args = process.argv.slice(2);
  const chainArg = args.find((a) => a.startsWith("--chain="))?.split("=")[1];
  const runAll = args.includes("--all") || !chainArg;

  let chains: string[];
  if (runAll) {
    chains = Object.keys(CHAIN_CONFIGS);
    console.log(`Starting ALL ${chains.length} agents: ${chains.join(", ").toUpperCase()}\n`);
  } else {
    // Support comma-separated: --chain=base,arb,eth
    const requested = chainArg!.toLowerCase().split(",");
    for (const c of requested) {
      if (!CHAIN_CONFIGS[c]) {
        console.error(`Unknown chain: ${c}. Available: ${Object.keys(CHAIN_CONFIGS).join(", ")}`);
        process.exit(1);
      }
    }
    chains = requested;
    console.log(`Starting ${chains.length} agent(s): ${chains.join(", ").toUpperCase()}\n`);
  }

  // Create agents
  const agents: Agent[] = chains.map((chain) => {
    const config = CHAIN_CONFIGS[chain]();
    return new Agent(config);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n\nShutting down agents...");
    agents.forEach((agent) => agent.stop());
    setTimeout(() => process.exit(0), 2000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Launch all agents in parallel
  console.log(`Launching ${agents.length} agent(s)...\n`);
  await Promise.all(agents.map((agent) => agent.run()));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
