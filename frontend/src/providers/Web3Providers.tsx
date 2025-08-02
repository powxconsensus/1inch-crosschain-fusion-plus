'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './../lib/wagmi';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient();

export default function Web3Providers({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={
            resolvedTheme === 'dark'
              ? darkTheme({
                  accentColor: 'var(--cta_color)',
                  accentColorForeground: 'white',
                  borderRadius: 'medium',
                  fontStack: 'system',
                })
              : lightTheme({
                  accentColor: 'var(--cta_color)',
                  accentColorForeground: 'white',
                  borderRadius: 'medium',
                  fontStack: 'system',
                })
          }
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
