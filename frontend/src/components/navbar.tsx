'use client';

import Image from 'next/image';
import Link from 'next/link';
import WalletConnect from './WalletConnect';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-lg border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 relative">
              <Image src="/logo.png" alt="Fusion Bridge" fill className="object-contain" priority />
            </div>
            <span className="text-lg font-semibold text-white">Fusion Bridge</span>
          </Link>

          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}
