'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Settings, User } from 'lucide-react';
import TokenInput from './TokenInput';
import ChainSelector from './ChainSelector';
import { ChainConfig } from '@/types/chain';
import { useWalletStore } from '@/store/walletStore';
import { CHAIN_CONFIGS } from '@/constants/chain';
import { ethers } from 'ethers';

const SwapCard = () => {
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [fromChain, setFromChain] = useState<ChainConfig>(CHAIN_CONFIGS.sepolia);
  const [toChain, setToChain] = useState<ChainConfig>(CHAIN_CONFIGS.sui);
  const [recipient, setRecipient] = useState<string>('');

  const { activeChain, isConnected, address } = useWalletStore();

  useEffect(() => {
    if (activeChain) {
      setFromChain(activeChain);
    }
  }, [activeChain]);

  const handleSwap = async () => {
    if (!isConnected || !recipient) return;
    // generate random secret and store it in local storage, and it should be secure
    const secret = ethers.hexlify(ethers.randomBytes(64));
    localStorage.setItem('swap_secret', secret);

    // post these data to the server
    console.log('Swap initiated', {
      fromChain,
      toChain,
      fromAmount,
      toAmount,
      userAddress: address,
      recipient,
      hashLock: ethers.keccak256(secret),
    });

    // then it will give calldata to swap
    // const calldata = await swap(secret);
    // then user should sign and send the transaction to the respective chain
    // then backend will to the validation
    // it will poll the status of the tx now, once status becomes share seccret it will share to server by doing api call
    // once shared then resolver withdraw the fund from source chain
    // and tx is now market as completed
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-[480px] bg-[#0f172a] rounded-2xl p-4 shadow-xl border border-[#1e293b]">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-semibold text-white">Swap</div>
          <button className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>

        {/* From Token Section */}
        <div className="bg-[#1e293b] rounded-xl p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#94a3b8]">Pay on</span>
            <div className="w-[140px]">
              <ChainSelector selectedChain={fromChain} onChainSelect={setFromChain} />
            </div>
          </div>
          <TokenInput
            value={fromAmount}
            onChange={setFromAmount}
            side="from"
            chainConfig={fromChain}
          />
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            className="bg-[#1e293b] p-2 rounded-lg hover:bg-[#2d3b4f] transition-colors"
            onClick={() => {
              setFromChain(toChain);
              setToChain(fromChain);
              setFromAmount(toAmount);
              setToAmount(fromAmount);
            }}
          >
            <ArrowDown className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>

        {/* To Token Section */}
        <div className="bg-[#1e293b] rounded-xl p-4 mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#94a3b8]">Receive on</span>
            <div className="w-[140px]">
              <ChainSelector selectedChain={toChain} onChainSelect={setToChain} />
            </div>
          </div>
          <TokenInput value={toAmount} onChange={setToAmount} side="to" chainConfig={toChain} />
        </div>

        {/* Recipient Address */}
        <div className="mt-4 bg-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-[#94a3b8]" />
            <span className="text-[#94a3b8]">Recipient Address</span>
          </div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter recipient address"
            className="w-full bg-transparent text-white outline-none placeholder-[#475569]"
          />
        </div>

        {/* Swap Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!isConnected || !recipient}
          className={`
            w-full mt-4 py-4 rounded-xl font-semibold transition-all
            ${
              isConnected && recipient
                ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white cursor-pointer'
                : 'bg-[#1e293b] text-[#64748b] cursor-not-allowed'
            }
          `}
          onClick={handleSwap}
        >
          {!isConnected
            ? 'Connect Wallet to Swap'
            : !recipient
              ? 'Enter Recipient Address'
              : 'Swap'}
        </motion.button>
      </div>
    </div>
  );
};

export default SwapCard;
