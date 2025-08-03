export interface DeploymentInfo {
  timestamp: number;
  network: string;
  chainId: string;
  contractName?: string;
  packageId?: string;
  contractAddress?: string;
  deploymentTxHash?: string;
  blockHeight?: number;
  objects?: {
    [key: string]: string;
  };
  metadata?: {
    [key: string]: any;
  };
}

export interface DeploymentCache {
  [chainType: string]: {
    [network: string]: {
      [contractName: string]: DeploymentInfo;
    };
  };
}

export interface NetworkConfig {
  rpc: string;
  chainId: string;
  explorer?: string;
  decimals: number;
  symbol: string;
}

export interface Networks {
  evm: {
    [key: string]: NetworkConfig;
  };
  sui: {
    [key: string]: NetworkConfig;
  };
}

export interface TokenAmount {
  token: string;
  amount: string;
}

export interface TimeLocks {
  withdrawalPeriod: number; // Base withdrawal timelock
  publicWithdrawalPeriod: number; // Public withdrawal timelock (usually 2x withdrawal)
  cancellationPeriod: number; // Cancellation timelock
}

export interface ChainInfo {
  chainId: string;
  token: string;
  amount: TokenAmount;
  escrowAddress?: string;
  timeLocks?: string; // Packed timelocks
  txHash?: string;
  timestamp?: string;
}

export enum OrderStatus {
  PENDING = "PENDING",
  SOURCE_ESCROW_CREATED = "SOURCE_ESCROW_CREATED",
  DEST_ESCROW_CREATED = "DEST_ESCROW_CREATED",
  SECRET_SHARED = "SECRET_SHARED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface OrderInfo {
  id: string;
  orderHash: string;
  timestamp: number;
  dstRecipient: string;
  status: OrderStatus;
  hashLock: string;
  maker: string;
  taker?: string;
  secret?: string;
  sourceInfo: ChainInfo;
  destInfo: ChainInfo;
  safetyDeposit: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface OrderCache {
  [orderId: string]: OrderInfo;
}
