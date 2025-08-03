import { contracts } from "./contracts";

interface NetworkConfig {
  rpc: string;
  type: "evm" | "sui";
  chainId: string;
  explorer?: string;
  decimals: number;
  symbol: string;
  contracts: {
    accessToken: string;
    escrowFactory: string;
  };
}

interface Networks {
  evm: {
    [key: string]: NetworkConfig;
  };
  sui: {
    [key: string]: NetworkConfig;
  };
}

const CHAIN_ID_TO_NETWORK = {
  "43113": {
    network: "fuji",
    type: "evm",
  },
  "11155111": {
    network: "sepolia",
    type: "evm",
  },
  "sui-testnet": {
    network: "testnet",
    type: "sui",
  },
  "sui-devnet": {
    network: "devnet",
    type: "sui",
  },
};

export const networks: Networks = {
  evm: {
    fuji: {
      type: "evm",
      rpc: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: "43113",
      explorer: "https://testnet.snowtrace.io",
      decimals: 18,
      symbol: "AVAX",
      contracts: contracts.evm.fuji,
    },
    sepolia: {
      type: "evm",
      rpc: "https://rpc.sepolia.org",
      chainId: "11155111",
      explorer: "https://sepolia.etherscan.io",
      decimals: 18,
      symbol: "ETH",
      contracts: contracts.evm.fuji,
    },
  },
  sui: {
    testnet: {
      type: "sui",
      rpc: "https://fullnode.testnet.sui.io:443",
      chainId: "sui-testnet",
      explorer: "https://testnet.sui.io",
      decimals: 18,
      symbol: "SUI",
      contracts: contracts.evm.fuji,
    },
    devnet: {
      type: "sui",
      rpc: "https://fullnode.devnet.sui.io:443",
      chainId: "sui-devnet",
      explorer: "https://testnet.sui.io",
      decimals: 18,
      symbol: "SUI",
      contracts: contracts.evm.fuji,
    },
  },
};

export const getChainConfigFromChainId = (chainId: string) => {
  const network =
    CHAIN_ID_TO_NETWORK[chainId as keyof typeof CHAIN_ID_TO_NETWORK];
  if (!network) {
    throw new Error(`Chain ID ${chainId} not found`);
  }
  return networks[network.type as keyof Networks][network.network];
};
