import { create } from 'zustand';
import { ChainConfig, ChainType } from '@/types/chain';
import { CHAIN_CONFIGS } from '@/constants/chain';
import { SendTransactionMutate } from 'wagmi/query';
import { Config } from 'wagmi';
import { WalletContextState } from '@suiet/wallet-kit';

type HexString = `0x${string}`;

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
  sendTransaction: ({
    to,
    value,
    chain,
    data,
    gasLimit,
  }: {
    to: string;
    value: string;
    chain: ChainConfig;
    data: string;
    gasLimit?: number;
  }) => void;
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
  sendTransaction: ({ to, value, chain, data, gasLimit }) => {
    switch (chain.chainType) {
      case ChainType.EVM: {
        return (get().transport as SendTransactionMutate<Config, unknown>)?.({
          to: to.startsWith('0x') ? (to as HexString) : `0x${to}`,
          value: BigInt(value),
          // chainId: Number(chain.chainId),
          data: data.startsWith('0x') ? (data as HexString) : (data as `0x${string}`),
          gas: BigInt(gasLimit ? gasLimit : 500000),
        });
      }
      case ChainType.SUI: {
        // TODO: Implement Sui transport
        return;
      }
      default: {
        throw new Error('Invalid chain type');
      }
    }
  },
}));
