import { Amount } from './create-order.dto';

export class QuoteResponseDto {
  orderHash?: string;
  sourceChainId: string;
  destChainId: string;
  sourceToken: string;
  destToken: string;
  sourceAmount: Amount;
  destAmount: Amount;
  maker: string;
  escrowFactory: string;
  fromTokenPriceUSD: string;
  toTokenPriceUSD: string;
  exchangeRate: string;
  totalValueUSD: string;
  estimatedFee: string;
  calldata?: {
    data: string;
    value: string;
    to: string;
  };
}
