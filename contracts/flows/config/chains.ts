export enum ChainType {
  EVM = "evm",
  SUI = "sui",
}
export type ChainConfig = {
  name: string;
  symbol: string;
  rpc: string;
  decimals: number;
  explorer: string[];
  type: ChainType;
  chainId: string;
};

export const chains: Record<string, ChainConfig> = {
  "43113": {
    name: "Avalanche",
    symbol: "AVAX",
    chainId: "43113",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    decimals: 18,
    explorer: ["https://testnet.snowtrace.io"],
    type: ChainType.EVM,
  },
  "11155111": {
    name: "Sepolia",
    symbol: "ETH",
    chainId: "11155111",
    rpc: "https://rpc.sepolia.org",
    decimals: 18,
    explorer: ["https://sepolia.etherscan.io"],
    type: ChainType.EVM,
  },
  "sui-testnet": {
    name: "Sui Testnet",
    symbol: "SUI",
    chainId: "sui-testnet",
    rpc: "https://fullnode.testnet.sui.io:443",
    decimals: 18,
    explorer: ["https://testnet.sui.io"],
    type: ChainType.SUI,
  },
};

export const getChainConfigFromChainId = (chainId: string) => {
  return chains[chainId as keyof typeof chains];
};
