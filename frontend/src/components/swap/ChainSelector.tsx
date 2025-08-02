'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Chain, ChainConfig, SUPPORTED_CHAINS } from '@/types/chain';
import { CHAIN_CONFIGS } from '@/constants/chain';

interface ChainSelectorProps {
  selectedChain: ChainConfig;
  onChainSelect: (chain: ChainConfig) => void;
}

const ChainSelector = ({ selectedChain, onChainSelect }: ChainSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <Image
                src={selectedChain.logoUrl}
                alt={selectedChain.name}
                fill
                className="rounded-full"
              />
            </div>
            <span className="text-sm font-medium text-[#94a3b8]">{selectedChain.name}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bg-[#0f172a] rounded-xl p-2 shadow-xl border border-[#1e293b] w-[200px] z-50"
          sideOffset={5}
        >
          <div className="space-y-1">
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1e293b] transition-colors ${
                  selectedChain.id === chain ? 'bg-[#1e293b]' : ''
                }`}
                onClick={() => {
                  onChainSelect(CHAIN_CONFIGS[chain]);
                  setOpen(false);
                }}
              >
                <div className="w-6 h-6 relative">
                  <Image
                    src={CHAIN_CONFIGS[chain].logoUrl}
                    alt={CHAIN_CONFIGS[chain].name}
                    fill
                    className="rounded-full"
                  />
                </div>
                <span className="text-sm font-medium text-[#94a3b8]">
                  {CHAIN_CONFIGS[chain].name}
                </span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default ChainSelector;
