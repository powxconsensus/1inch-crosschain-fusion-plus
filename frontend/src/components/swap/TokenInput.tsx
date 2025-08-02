'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Chain, ChainConfig } from '@/types/chain';
import { TOKENS } from '@/constants/chain';

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  side: 'from' | 'to';
  chainConfig: ChainConfig;
}

const TokenInput = ({ value, onChange, side, chainConfig }: TokenInputProps) => {
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(TOKENS[chainConfig.id][0]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={handleAmountChange}
          placeholder="0.0"
          className="flex-1 bg-transparent text-3xl font-medium outline-none text-white placeholder-[#475569]"
        />
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0f172a] rounded-full hover:bg-[#1e293b] transition-colors">
              <div className="w-6 h-6 relative">
                <Image
                  src={selectedToken.logoUrl || '/tokens/unknown.svg'}
                  alt={selectedToken.symbol}
                  fill
                  className="rounded-full"
                />
              </div>
              <span className="text-sm font-medium text-[#94a3b8]">{selectedToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="bg-[#0f172a] rounded-xl p-2 shadow-xl border border-[#1e293b] w-[200px] z-50"
              sideOffset={5}
            >
              <div className="space-y-1">
                {TOKENS[chainConfig.id].map((token) => (
                  <button
                    key={token.address}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1e293b] transition-colors ${
                      selectedToken.address === token.address ? 'bg-[#1e293b]' : ''
                    }`}
                    onClick={() => {
                      setSelectedToken(token);
                      setOpen(false);
                    }}
                  >
                    <div className="w-6 h-6 relative">
                      <Image
                        src={token.logoUrl || '/tokens/unknown.svg'}
                        alt={token.symbol}
                        fill
                        className="rounded-full"
                      />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-[#94a3b8]">{token.symbol}</span>
                      <span className="text-xs text-[#64748b]">{token.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <div className="text-sm text-[#64748b]">~${(parseFloat(value || '0') * 1).toFixed(2)}</div>
    </div>
  );
};

export default TokenInput;
