'use client';
import { http } from 'wagmi';
import {
  mainnet,
  polygon,
  sepolia,
  holesky,
  base,
  baseSepolia,
  avalancheFuji,
  arbitrumSepolia,
} from 'wagmi/chains';
import { createConfig } from 'wagmi';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, polygon, holesky, base, baseSepolia, avalancheFuji, arbitrumSepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [polygon.id]: http(),
    [holesky.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
});
