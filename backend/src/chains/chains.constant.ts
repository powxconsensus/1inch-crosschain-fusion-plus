import { Chain, ChainConfig, ChainType, Token } from './chains.types';

export const CHAIN_ID_TO_CONFIG_ID: Record<string, Chain> = {
  '11155111': 'sepolia',
  '43113': 'avalanche',
  sui: 'sui',
};

// keeping safetly deposit small for testing
export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    network: 'testnet',
    rpcUrl: 'https://1rpc.io/sepolia',
    blockExplorer: 'https://sepolia.etherscan.io',
    logoUrl: '/chains/ethereum.svg',
    chainType: ChainType.EVM,
    startBlock: 89022290,
    processDelay: 2,
    safetyDeposit: '10000000000',
    decimals: 18,
    accessToken: '0x80d92BabA2E9C1aC7064ce92917a6970aC335251',
    escrowFactoryAddress: '0x5dd45E5C4F8cC9eF4102A4b59cD8C99dc179dCDf',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    chainId: '43113',
    network: 'testnet',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    logoUrl: '/chains/avalanche.svg',
    chainType: ChainType.EVM,
    startBlock: 44275560,
    processDelay: 2,
    safetyDeposit: '1000000000000',
    escrowFactoryAddress: '0x5751bd60F8b19E94EF729B63cD2CC91195FC1Ec3',

    decimals: 18,
  },
  sui: {
    id: 'sui',
    name: 'Sui',
    chainId: 'sui',
    network: 'testnet',
    logoUrl: '/chains/sui.svg',
    chainType: ChainType.SUI,
    startBlock: 44266130,
    processDelay: 2,
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    blockExplorer: 'https://explorer.testnet.sui.io',
    safetyDeposit: '10000000000',
    escrowFactoryAddress:
      '0xd0cfb90578f4753232351f04798b303a3a632bc24bf239dfca4ff7a63b4f1f84f005fe53482992fb386dd65f6f5ac6319d26abc30eb11d5610588039c58cc5c2',
    decimals: 9,
  },
};

export function getChainConfigFromChainId(chainId: string): ChainConfig {
  return CHAIN_CONFIGS[CHAIN_ID_TO_CONFIG_ID[chainId] as Chain];
}

// TODO: get price from API
export const PRICE_MAP: Record<string, { value: string; decimals: number }> = {
  USDC: {
    value: '1000000',
    decimals: 6,
  },
  USDT: {
    value: '1000000',
    decimals: 6,
  },
  ETH: {
    value: '342089',
    decimals: 2,
  },
  SUI: {
    value: '33338',
    decimals: 4,
  },
  TRX: {
    value: '32',
    decimals: 2,
  },
};

export const TOKENS: Record<Chain, Token[]> = {
  sepolia: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      decimals: 18,
      chain: 'sepolia',
      logoUrl: '/tokens/eth.svg',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      chain: 'sepolia',
      logoUrl: '/tokens/usdc.svg',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x04b866D0027c3e352d2C8E2046b83d4b595d6dF9',
      decimals: 6,
      chain: 'sepolia',
      logoUrl: '/tokens/usdt.svg',
    },
  ],
  avalanche: [
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      decimals: 18,
      chain: 'avalanche',
      logoUrl: '/tokens/avax.svg',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x5425890298aed601595a70AB815c96711a31Bc65',
      decimals: 6,
      chain: 'avalanche',
      logoUrl: '/tokens/usdc.svg',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xf85C516579E97f0744917f0C8A0Ffc6aca98283d',
      decimals: 6,
      chain: 'avalanche',
      logoUrl: '/tokens/usdt.svg',
    },
  ],
  sui: [
    {
      symbol: 'sui',
      name: 'Sui',
      address:
        '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      decimals: 9,
      chain: 'sui',
      logoUrl: '/tokens/usdt.svg',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address:
        '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf',
      decimals: 6,
      chain: 'sui',
      logoUrl: '/tokens/usdc.svg',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address:
        '0x2d624c909e7f2c9483642d68240615ba2f8cce66591b9e03c6d6ea721a5d2d19',
      decimals: 6,
      chain: 'sui',
      logoUrl: '/tokens/usdt.svg',
    },
  ],
};
