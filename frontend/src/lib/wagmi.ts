import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        injectedWallet,
        metaMaskWallet,
        phantomWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'ArcMind',
    projectId: 'b1e43462c7e511681bda4f9e3e3b0f79',
  }
);

export const config = createConfig({
  connectors,
  chains: [arcTestnet, sepolia],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
    [sepolia.id]: http(),
  },
  ssr: true,
});
