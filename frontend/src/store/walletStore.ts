import { create } from 'zustand';
import { ChainConfig } from '@/types/chain';
import { CHAIN_CONFIGS } from '@/constants/chain';

interface WalletState {
  activeChain: ChainConfig | null;
  address: string | null;
  isConnected: boolean;
  setActiveChain: (chainType: ChainConfig | null) => void;
  setConnected: ({ address, isConnected }: { address: string; isConnected: boolean }) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  activeChain: null,
  address: null,
  isConnected: false,
  setActiveChain: (chain) => set({ activeChain: chain }),
  setConnected: ({ address, isConnected }) => set({ address, isConnected: !!address }),
  disconnect: () =>
    set({
      activeChain: CHAIN_CONFIGS.sepolia,
      address: null,
      isConnected: false,
    }),
}));
