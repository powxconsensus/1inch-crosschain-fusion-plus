import { Chain, ChainConfig, ChainType, Network, Token } from '@/types/chain';

export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    network: 'testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    logoUrl: '/chains/ethereum.svg',
    chainType: ChainType.EVM,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    chainId: '43113', // Fuji testnet
    network: 'testnet',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    logoUrl: '/chains/avalanche.svg',
    chainType: ChainType.EVM,
  },
  sui: {
    id: 'sui',
    name: 'Sui',
    chainId: 'sui',
    network: 'testnet',
    logoUrl: '/chains/sui.svg',
    chainType: ChainType.SUI,
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    blockExplorer: 'https://explorer.testnet.sui.io',
  },
};

export const TOKENS: Record<Chain, Token[]> = {
  sepolia: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // example testnet address
      decimals: 6,
      chain: 'sepolia',
      logoUrl: '/tokens/usdc.svg',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x876A7B01f3AB595F85683896A83117EcF6E7b9D9', // example testnet address
      decimals: 6,
      chain: 'sepolia',
      logoUrl: '/tokens/usdt.svg',
    },
  ],
  avalanche: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x5425890298aed601595a70AB815c96711a31Bc65', // example testnet address
      decimals: 6,
      chain: 'avalanche',
      logoUrl: '/tokens/usdc.svg',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xb9C31Ea1D475c25E58a1bE1a46221db55E5A7C6e', // example testnet address
      decimals: 6,
      chain: 'avalanche',
      logoUrl: '/tokens/usdt.svg',
    },
  ],
  sui: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf', // example testnet address
      decimals: 6,
      chain: 'sui',
      logoUrl: '/tokens/usdc.svg',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x2d624c909e7f2c9483642d68240615ba2f8cce66591b9e03c6d6ea721a5d2d19', // example testnet address
      decimals: 6,
      chain: 'sui',
      logoUrl: '/tokens/usdt.svg',
    },
  ],
};
