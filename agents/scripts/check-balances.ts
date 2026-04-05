/**
 * Check ETH and USDC balances for the TEE signer wallet on all deployed chains.
 * Run: npx ts-node scripts/check-balances.ts
 */
import { ethers } from "ethers";

const TEE_PK = process.env.TEE_PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";
const AGENT_PK = process.env.AGENT_PRIVATE_KEY || "0x7acc009af32ce835504067eb88b3af1753b9d3b0e5ef529d58885910c355c28a";

const CHAINS: { name: string; rpc: string; usdc: string }[] = [
  { name: "ETH Sepolia", rpc: "https://rpc.sepolia.org", usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
  { name: "Base Sepolia", rpc: "https://sepolia.base.org", usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
  { name: "Arb Sepolia", rpc: "https://sepolia-rollup.arbitrum.io/rpc", usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" },
  { name: "AVAX Fuji", rpc: "https://api.avax-test.network/ext/bc/C/rpc", usdc: "0x6a17716Ce178e84835cfA73AbdB71cb455032456" },
  { name: "OP Sepolia", rpc: "https://sepolia.optimism.io", usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" },
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

async function checkWallet(label: string, address: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}: ${address}`);
  console.log(`${"═".repeat(60)}`);

  for (const chain of CHAINS) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc, undefined, { staticNetwork: true });
      const ethBalance = await Promise.race([
        provider.getBalance(address),
        new Promise<bigint>((_, r) => setTimeout(() => r(new Error("timeout")), 5000)),
      ]);

      let usdcBalance = 0n;
      try {
        const usdc = new ethers.Contract(chain.usdc, ERC20_ABI, provider);
        usdcBalance = await Promise.race([
          usdc.balanceOf(address),
          new Promise<bigint>((_, r) => setTimeout(() => r(new Error("timeout")), 5000)),
        ]);
      } catch {}

      const ethStr = ethers.formatEther(ethBalance);
      const usdcStr = ethers.formatUnits(usdcBalance, 6);
      const ethOk = ethBalance > 0n ? "OK" : "NEEDS FUNDING";
      const usdcOk = usdcBalance > 0n ? "OK" : "NEEDS FUNDING";

      console.log(`  ${chain.name.padEnd(15)} ETH: ${ethStr.padEnd(15)} [${ethOk}]  USDC: ${usdcStr.padEnd(12)} [${usdcOk}]`);
    } catch (error: any) {
      console.log(`  ${chain.name.padEnd(15)} ERROR: ${error.message}`);
    }
  }
}

async function main() {
  const teeWallet = new ethers.Wallet(TEE_PK);
  const agentWallet = new ethers.Wallet(AGENT_PK);

  await checkWallet("TEE Signer (signs TXs)", teeWallet.address);
  await checkWallet("Agent Wallet (runs agent loop)", agentWallet.address);

  console.log(`\n${"═".repeat(60)}`);
  console.log("  FUNDING GUIDE");
  console.log(`${"═".repeat(60)}`);
  console.log(`
  The TEE wallet signs all on-chain transactions (deposits, withdrawals, bridges).
  It needs ETH (for gas) and USDC (for deposits) on each chain.

  Faucets:
  ────────
  1. ETH Sepolia ETH:  https://sepoliafaucet.com or https://faucet.google.com/ethereum-sepolia
  2. Base Sepolia ETH:  https://faucet.quicknode.com/base/sepolia
  3. Arb Sepolia ETH:   https://faucet.arbitrum.io
  4. AVAX Fuji AVAX:    https://faucet.avax.network
  5. OP Sepolia ETH:    https://faucet.optimism.xyz

  USDC (Circle faucet — works for all Sepolia + Fuji):
    https://faucet.circle.com
    - Select the chain, paste the TEE wallet address
    - Get 10 USDC per request (can repeat)

  0G Testnet OG tokens:
    https://faucet.0g.ai
    - Need 3+ OG for compute ledger, 1+ OG per inference provider

  TEE Wallet: ${teeWallet.address}
  Agent Wallet: ${agentWallet.address}
`);
}

main().catch(console.error);
