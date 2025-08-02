'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Settings, User } from 'lucide-react';
import TokenInput from './TokenInput';
import ChainSelector from './ChainSelector';
import { ChainConfig, ChainType } from '@/types/chain';
import { useWalletStore } from '@/store/walletStore';
import { CHAIN_CONFIGS, TOKENS } from '@/constants/chain';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

// ERC20 ABI for token approval
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
];

interface AmountDto {
  amount: string;
  decimals: number;
}

interface QuoteDto {
  sourceChainId: string;
  destChainId: string;
  sourceToken: string;
  destToken: string;
  sourceAmount: AmountDto;
  maker: string;
}

interface QuoteResponseDto {
  sourceChainId: string;
  destChainId: number;
  sourceToken: string;
  destToken: string;
  sourceAmount: AmountDto;
  maker: string;
  destAmount: AmountDto;
  escrowFactory: string;
  estimatedFee: number;
  totalValueUSD: number;
  exchangeRate: number;
  fromTokenPriceUSD: number;
  toTokenPriceUSD: number;
}

interface SwapState {
  amount: string;
  chain: ChainConfig;
  token: any;
}

interface OrderCalldata {
  data: string;
  value: string;
  to: string;
  gasLimit: number;
}

interface CreateOrderResponse {
  calldata: OrderCalldata;
}

const SwapCard = () => {
  const [fromState, setFromState] = useState<SwapState>({
    amount: '',
    chain: CHAIN_CONFIGS.sepolia,
    token: TOKENS[CHAIN_CONFIGS.sepolia.id][0],
  });
  const [toState, setToState] = useState<SwapState>({
    amount: '',
    chain: CHAIN_CONFIGS.sui,
    token: TOKENS[CHAIN_CONFIGS.sui.id][0],
  });
  const [recipient, setRecipient] = useState<string>('');
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const { activeChain, isConnected, address, sendTransaction } = useWalletStore();
  // Update source chain and token when wallet chain changes
  useEffect(() => {
    if (activeChain) {
      setFromState((prev) => ({
        ...prev,
        chain: activeChain,
        token: TOKENS[activeChain.id][0],
      }));
    }
  }, [activeChain]);

  // Fetch quote when from amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromState.amount || !isConnected) return;

      try {
        const quoteDto: QuoteDto = {
          sourceChainId: fromState.chain.chainId,
          destChainId: toState.chain.chainId,
          sourceToken: fromState.token.address,
          destToken: toState.token.address,
          sourceAmount: {
            amount: fromState.amount,
            decimals: fromState.token.decimals,
          },
          maker: address || '0',
        };

        const response = await fetch('http://localhost:3000/orders/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quoteDto),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch quote');
        }

        const quote: QuoteResponseDto = await response.json();
        setQuoteResponse(quote);

        // Update destination amount based on quote
        setToState((prev) => ({
          ...prev,
          amount: quote.destAmount.amount,
        }));
      } catch (error) {
        console.error('Error fetching quote:', error);
      }
    };

    // Debounce the quote fetch to avoid too many requests
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [
    fromState.amount,
    fromState.chain.id,
    toState.chain.id,
    fromState.token.address,
    toState.token.address,
    address,
    isConnected,
  ]);

  const checkBalance = async () => {
    if (!address || !fromState.token.address) return false;

    try {
      let balance: BigNumber = new BigNumber(0);
      if (fromState.chain.chainType === ChainType.EVM) {
        const tokenContract = new ethers.Contract(
          fromState.token.address,
          ERC20_ABI,
          new ethers.JsonRpcProvider(fromState.chain.rpcUrl),
        );
        const rawBalance = await tokenContract.balanceOf(address);
        balance = new BigNumber(rawBalance.toString());
      } else if (fromState.chain.chainType === ChainType.SUI) {
        // TODO: Implement Sui balance check
        // For now, assume sufficient balance
        return true;
      }

      const rawAmount = ethers.parseUnits(fromState.amount, fromState.token.decimals);
      const amountBN = new BigNumber(rawAmount.toString());
      if (balance.isLessThan(amountBN)) {
        setError('Insufficient balance');
        return false;
      }

      setError(null);
      return true;
    } catch (error) {
      console.error('Error checking balance:', error);
      setError('Error checking balance');
      return false;
    }
  };

  const checkAndApprove = async () => {
    if (!address || !quoteResponse) return false;

    try {
      if (fromState.chain.chainType === ChainType.EVM) {
        const tokenContract = new ethers.Contract(
          fromState.token.address,
          ERC20_ABI,
          new ethers.JsonRpcProvider(fromState.chain.rpcUrl),
        );
        const amount = ethers.parseUnits(fromState.amount, fromState.token.decimals);
        console.log(amount.toString());

        // Check current allowance
        const rawAllowance = await tokenContract.allowance(address, quoteResponse.escrowFactory);
        const currentAllowance = new BigNumber(rawAllowance.toString());
        if (currentAllowance.isLessThan(amount)) {
          setIsApproving(true);
          const calldata = tokenContract.interface.encodeFunctionData('approve', [
            quoteResponse.escrowFactory,
            amount,
          ]);
          console.log('Approval calldata:', calldata);
          sendTransaction({
            to: fromState.token.address,
            value: '0',
            chain: fromState.chain,
            data: calldata,
            gasLimit: 800000,
          });
          setIsApproving(false);
        }
        return true;
      } else if (fromState.chain.chainType === ChainType.SUI) {
        // TODO: Implement Sui approval if needed
        // For Sui, we might not need explicit approval
        return true;
      }
    } catch (error) {
      console.error('Error during approval:', error);
      setError('Error during approval');
      setIsApproving(false);
      return false;
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !recipient || !quoteResponse) return;

    try {
      setError(null);

      // Check balance
      const hasBalance = await checkBalance();
      if (!hasBalance) return;

      // Check and handle approvals
      const isApproved = await checkAndApprove();
      if (!isApproved) return;

      const secret = ethers.hexlify(ethers.randomBytes(64));
      localStorage.setItem('swap_secret', secret);

      console.log('Swap initiated', {
        fromChain: fromState.chain,
        toChain: toState.chain,
        fromAmount: fromState.amount,
        toAmount: toState.amount,
        fromToken: fromState.token,
        toToken: toState.token,
        userAddress: address,
        recipient,
        hashLock: ethers.keccak256(secret),
      });

      // Create order
      const createOrderResponse = await fetch('http://localhost:3000/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashLock: ethers.keccak256(secret),
          maker: address || '0',
          sourceInfo: {
            chainId: fromState.chain.chainId,
            token: fromState.token.address,
            amount: {
              amount: fromState.amount,
              decimals: fromState.token.decimals,
            },
          },
          destInfo: {
            chainId: toState.chain.chainId,
            token: toState.token.address,
            amount: {
              amount: toState.amount,
              decimals: toState.token.decimals,
            },
          },
          sourceChainId: fromState.chain.chainId,
          destChainId: toState.chain.chainId,
          sourceToken: fromState.token.address,
          destToken: toState.token.address,
          sourceAmount: {
            amount: fromState.amount,
            decimals: fromState.token.decimals,
          },
          minDestAmount: {
            amount: toState.amount,
            decimals: toState.token.decimals,
          },
          timeLock: Math.floor(Date.now() / 1000 + 3600).toString(), // 1 hour from now
        }),
      });

      if (!createOrderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData: CreateOrderResponse = await createOrderResponse.json();
      console.log('Order created with calldata:', orderData);

      // Send the transaction with the received calldata
      sendTransaction({
        to: orderData.calldata.to,
        value: orderData.calldata.value,
        chain: fromState.chain,
        data: orderData.calldata.data,
        gasLimit: orderData.calldata.gasLimit,
      });
    } catch (error) {
      console.error('Error during swap:', error);
      setError('Error during swap');
    }
  };

  const handleSwapDirection = () => {
    setFromState(toState);
    setToState(fromState);
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
              <ChainSelector
                selectedChain={fromState.chain}
                onChainSelect={(chain) =>
                  setFromState((prev) => ({
                    ...prev,
                    chain,
                    token: TOKENS[chain.id][0],
                  }))
                }
                excludeChain={toState.chain}
              />
            </div>
          </div>
          <TokenInput
            value={fromState.amount}
            onChange={(amount) => setFromState((prev) => ({ ...prev, amount }))}
            side="from"
            chainConfig={fromState.chain}
            selectedToken={fromState.token}
            onTokenChange={(token) => setFromState((prev) => ({ ...prev, token }))}
          />
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            className="bg-[#1e293b] p-2 rounded-lg hover:bg-[#2d3b4f] transition-colors"
            onClick={handleSwapDirection}
          >
            <ArrowDown className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>

        {/* To Token Section */}
        <div className="bg-[#1e293b] rounded-xl p-4 mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#94a3b8]">Receive on</span>
            <div className="w-[140px]">
              <ChainSelector
                selectedChain={toState.chain}
                onChainSelect={(chain) =>
                  setToState((prev) => ({
                    ...prev,
                    chain,
                    token: TOKENS[chain.id][0],
                  }))
                }
                excludeChain={fromState.chain}
              />
            </div>
          </div>
          <TokenInput
            value={toState.amount}
            onChange={(amount) => setToState((prev) => ({ ...prev, amount }))}
            side="to"
            chainConfig={toState.chain}
            selectedToken={toState.token}
            onTokenChange={(token) => setToState((prev) => ({ ...prev, token }))}
            readOnly={true}
          />
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

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Swap Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!isConnected || !recipient || isApproving}
          className={`
            w-full mt-4 py-4 rounded-xl font-semibold transition-all
            ${
              isConnected && recipient && !isApproving
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
              : isApproving
                ? 'Approving...'
                : 'Approve and Swap'}
        </motion.button>
      </div>
    </div>
  );
};

export default SwapCard;
