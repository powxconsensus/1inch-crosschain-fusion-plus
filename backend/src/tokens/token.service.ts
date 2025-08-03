import { Injectable } from '@nestjs/common';
import { TOKENS, PRICE_MAP } from '../chains/chains.constant';
import { Chain } from '../chains/chains.types';
import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { Amount } from 'src/orders/dto/create-order.dto';

// Configure Decimal for high precision
Decimal.set({ precision: 40 }); // High precision for calculations
const TEN = new Decimal(10);

@Injectable()
export class TokenService {
  // Get token decimals for a given chain and token address
  getTokenDecimals(chainId: string, tokenAddress: string): number {
    const chain = this.getChainFromChainId(chainId);
    const token = TOKENS[chain].find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    if (!token) {
      throw new Error('Token not found');
    }
    return token.decimals;
  }

  // Convert amount to chain specific decimals
  convertToChainDecimalsAmount(amount: Amount, chainDecimals: number): Amount {
    const amountBN = ethers.parseUnits(amount.amount, amount.decimals);
    if (amount.decimals === chainDecimals) {
      return amount;
    }
    if (amount.decimals < chainDecimals) {
      return {
        amount: (
          amountBN * BigInt(10 ** (chainDecimals - amount.decimals))
        ).toString(),
        decimals: chainDecimals,
      };
    }
    return {
      amount: (
        amountBN / BigInt(10 ** (amount.decimals - chainDecimals))
      ).toString(),
      decimals: chainDecimals,
    };
  }

  // Get token price in USD with high precision
  getTokenPrice(symbol: string): Decimal {
    const priceInfo = PRICE_MAP[symbol.toUpperCase()];
    if (!priceInfo) {
      throw new Error('Token price not found');
    }
    return new Decimal(priceInfo.value).div(TEN.pow(priceInfo.decimals));
  }

  // Calculate destination amount with 10% fee using Decimal for precision
  calculateDestAmount(
    srcAmount: Amount,
    srcPrice: number | Decimal,
    dstPrice: number | Decimal,
    dstDecimals: number,
  ): Amount {
    // Convert all inputs to Decimal for precise calculation
    const amount = new Decimal(srcAmount.amount);
    const srcPriceDecimal = new Decimal(srcPrice);
    const dstPriceDecimal = new Decimal(dstPrice);

    // Calculate source amount in USD with proper decimal handling
    const srcAmountInUSD = amount
      .div(TEN.pow(srcAmount.decimals))
      .mul(srcPriceDecimal);

    // Calculate fee (10%)
    const feeAmount = srcAmountInUSD.mul('0.1');
    const netAmountInUSD = srcAmountInUSD.sub(feeAmount);

    // Calculate destination amount
    const dstAmount = netAmountInUSD
      .div(dstPriceDecimal)
      .mul(TEN.pow(dstDecimals));

    // Return truncated amount (no rounding)
    return {
      amount: dstAmount.trunc().toString(),
      decimals: dstDecimals,
    };
  }

  private getChainFromChainId(chainId: string): Chain {
    const chainMap: Record<string, Chain> = {
      '11155111': 'sepolia',
      '43113': 'avalanche',
      sui: 'sui',
    };
    const chain = chainMap[chainId];
    if (!chain) {
      throw new Error('Chain not supported');
    }
    return chain;
  }

  getTokenSymbol(chainId: string, tokenAddress: string): string {
    const chain = this.getChainFromChainId(chainId);
    const token = TOKENS[chain].find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    if (!token) {
      throw new Error('Token not found');
    }
    return token.symbol;
  }
}
