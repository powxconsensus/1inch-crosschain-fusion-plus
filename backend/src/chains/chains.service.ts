import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ChainConfig, ChainType } from './chains.types';
import {
  CHAIN_ID_TO_CONFIG_ID,
  getChainConfigFromChainId,
} from './chains.constant';
import * as ESCROW_FACTORY_ABI from '../artifacts/evm/escrow.factory.json';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

@Injectable()
export class ChainsService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  async getProvider(chainId: string): Promise<ethers.JsonRpcProvider> {
    if (this.providers.has(chainId)) {
      return this.providers.get(chainId)!;
    }

    const chainConfig = getChainConfigFromChainId(chainId);
    if (!chainConfig) {
      throw new Error(`Chain config not found for chainId ${chainId}`);
    }

    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    this.providers.set(chainId, provider);
    return provider;
  }

  async checkTokenBalanceAndAllowance(
    chainId: string,
    tokenAddress: string,
    userAddress: string,
    amount: string,
    spenderAddress: string,
  ): Promise<{ hasBalance: boolean; hasAllowance: boolean }> {
    const chainConfig = getChainConfigFromChainId(chainId);
    switch (chainConfig.chainType) {
      case ChainType.EVM:
        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          provider,
        );
        const [balance, allowance] = await Promise.all([
          tokenContract.balanceOf(userAddress),
          tokenContract.allowance(userAddress, spenderAddress),
        ]);
        return {
          hasBalance: balance >= BigInt(amount),
          hasAllowance: allowance >= BigInt(amount),
        };
      case ChainType.SUI:
        // TODO: Implement SUI balance and allowance check
        return {
          hasBalance: false,
          hasAllowance: false,
        };
        break;
      default:
        throw new Error(`Chain ${chainId} not supported`);
    }
  }

  getEVMEscrowFactoryContract(chainId: string): ethers.Contract {
    const chainConfig = getChainConfigFromChainId(chainId);
    return new ethers.Contract(
      chainConfig.escrowFactoryAddress!,
      ESCROW_FACTORY_ABI,
      new ethers.JsonRpcProvider(chainConfig.rpcUrl),
    );
  }
}
