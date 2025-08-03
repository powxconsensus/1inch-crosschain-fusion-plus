import { create } from 'zustand';
import { ChainConfig, ChainType } from '@/types/chain';
import { CHAIN_CONFIGS } from '@/constants/chain';
import { SendTransactionMutate } from 'wagmi/query';
import { Config } from 'wagmi';
import { WalletContextState } from '@suiet/wallet-kit';

type HexString = `0x${string}`;

interface TransactionParams {
  to: string;
  value: string;
  chain: ChainConfig;
  data: string;
  gasLimit?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: Error) => void;
}

type SendTransactionResult = ReturnType<SendTransactionMutate<Config, unknown>>;

interface WalletState {
  activeChain: ChainConfig | null;
  address: string | null;
  isConnected: boolean;
  transport:
    | SendTransactionMutate<Config, unknown>
    | WalletContextState['signAndExecuteTransaction']
    | null;
  setActiveChain: (chainType: ChainConfig | null) => void;
  setConnected: ({
    address,
    isConnected,
    transport,
  }: {
    address: string;
    isConnected: boolean;
    transport: SendTransactionMutate<Config, unknown> | null;
  }) => void;
  disconnect: () => void;
  sendTransaction: (params: TransactionParams) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  activeChain: null,
  address: null,
  isConnected: false,
  transport: null,
  setActiveChain: (chain) => set({ activeChain: chain }),
  setConnected: ({ address, isConnected, transport }) =>
    set({ address, isConnected: !!address, transport }),
  disconnect: () =>
    set({
      activeChain: CHAIN_CONFIGS.sepolia,
      address: null,
      isConnected: false,
    }),
  sendTransaction: async ({ to, value, chain, data, gasLimit, onSuccess, onError }) => {
    switch (chain.chainType) {
      case ChainType.EVM: {
        try {
          const transport = get().transport as SendTransactionMutate<Config, unknown>;
          if (!transport) {
            throw new Error('Transport not available');
          }

          const result = (await transport({
            to: to.startsWith('0x') ? (to as HexString) : `0x${to}`,
            value: BigInt(value),
            chainId: Number(chain.chainId),
            data: data.startsWith('0x') ? (data as HexString) : (data as `0x${string}`),
          })) as unknown;

          if (typeof result === 'string') {
            onSuccess?.(result);
          } else {
            throw new Error('Invalid transaction result');
          }
        } catch (error) {
          onError?.(error as Error);
        }
        break;
      }
      case ChainType.SUI: {
        // TODO: Implement Sui transport
        break;
      }
      default: {
        const error = new Error('Invalid chain type');
        onError?.(error);
      }
    }
  },
}));
