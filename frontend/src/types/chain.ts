export type Chain = 'sepolia' | 'avalanche' | 'sui';
export type Network = 'testnet' | 'mainnet';

export type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chain: Chain;
  logoUrl?: string;
};

export type TokenAmount = {
  token: Token;
  amount: string;
};

export const SUPPORTED_CHAINS: Chain[] = ['sepolia', 'avalanche', 'sui'];

export enum ChainType {
  EVM = 'evm',
  SUI = 'sui',
}

export type ChainConfig = {
  id: Chain;
  chainType: ChainType;
  chainId: string;
  rpcUrl: string;
  logoUrl: string;
  name: string;
  blockExplorer: string;
  network: Network;
};
