// event related info
import { Log } from 'ethers';
import { ChainConfig } from 'src/chains/chains.types';

export type edata = {
  txHash: string;
  timestamp: number;
  chainConfig: ChainConfig;
  eventType: string;
};

export type SrcEscrowCreated = {
  orderHash: string;
  hashlock: string; // Hash of the secret.
  maker: string;
  taker: string;
  token: string;
  amount: string;
  safetyDeposit: string;
  timelocks: string;
  escrow: string;
} & edata;

export type DstEscrowCreated = {
  orderHash: string;
  escrow: string;
  hashlock: string;
  taker: string;
  timelocks: string;
} & edata;
