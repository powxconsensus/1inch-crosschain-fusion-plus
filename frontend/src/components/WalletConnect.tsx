'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ConnectButton as SuiConnectButton,
  useWallet,
  WalletContextState,
} from '@suiet/wallet-kit';
import { useWalletStore } from '@/store/walletStore';
import { ChainType } from '@/types/chain';
import { useAccount, useSendTransaction } from 'wagmi';
import { useEffect } from 'react';

const buttonStyle =
  'px-4 py-2 rounded-xl font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all';

export default function WalletConnect() {
  const { activeChain, setConnected } = useWalletStore();

  // for handling for evm chain
  const { address, isConnected: isEvmConnected } = useAccount();
  const { sendTransaction } = useSendTransaction();

  // for sui
  const { address: suiAddress, connected: isSuiConnected, signAndExecuteTransaction } = useWallet();

  useEffect(() => {
    if (isEvmConnected && address) {
      setConnected({ address, isConnected: isEvmConnected, transport: sendTransaction });
    }
    if (isSuiConnected && suiAddress) {
      setConnected({
        address: suiAddress,
        isConnected: isSuiConnected,
        transport: null, //signAndExecuteTransaction as any,
      });
    }
  }, [
    isEvmConnected,
    address,
    isSuiConnected,
    suiAddress,
    signAndExecuteTransaction,
    sendTransaction,
  ]);

  return activeChain?.chainType === ChainType.SUI ? (
    <div className={buttonStyle}>
      <SuiConnectButton />
    </div>
  ) : (
    <div className={buttonStyle}>
      <ConnectButton />
    </div>
  );
}
