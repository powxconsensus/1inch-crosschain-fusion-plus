// import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';
// import './globals.css';
// // import { Providers } from '@/components/providers';
// // import { Navbar } from "@/components/navbar";
// // import { Footer } from "@/components/footer";

// const inter = Inter({ subsets: ['latin'] });

// export const metadata: Metadata = {
//   title: 'Fusion Bridge',
//   description: 'Cross-chain bridge between EVM and SUI networks',
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body className={inter.className}>
//         {/* <Providers> */}
//         <div className="min-h-screen flex flex-col">
//           {/* <Navbab /> */}
//           <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
//           {/* <Footer /> */}
//         </div>
//         {/* </Providers> */}
//       </body>
//     </html>
//   );
// }

import type { Metadata } from 'next';
import { ThemeProvider } from '../providers/ThemeProvider';
import { Toaster } from 'sonner';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import Web3Providers from '../providers/Web3Providers';
import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';
import Navbar from '@/components/navbar';
import { Footer } from '@/components/footer';
import { SuiProviderWrapper } from '@/providers/SuiPorviderWrapper';

// const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fusion Bridge',
  description: 'Cross-chain bridge between EVM and SUI networks',
  // icons: {
  //   // icon: '/favicon.svg', // ✅ path relative to /public
  // },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cascadia+Code:ital,wght@0,200..700;1,200..700&family=IBM+Plex+Serif:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`antialiased`}>
        <ThemeProvider>
          <SuiProviderWrapper>
            <Web3Providers>
              <Navbar />
              <div className="min-h-screen bg-background text-primary">{children}</div>
              <Footer />
            </Web3Providers>
          </SuiProviderWrapper>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
