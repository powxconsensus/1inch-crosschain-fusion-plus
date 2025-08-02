'use client';

import { EthosWallet, SuietWallet, SuiWallet, WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';

export function SuiProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider defaultWallets={[SuietWallet, SuiWallet, EthosWallet]} autoConnect>
      {children}
    </WalletProvider>
  );
}
