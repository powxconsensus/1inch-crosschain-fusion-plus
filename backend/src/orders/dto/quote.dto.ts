import { IsString, IsNotEmpty, IsObject, IsNumber } from 'class-validator';
import { Amount } from './create-order.dto';

export class QuoteDto {
  @IsString()
  @IsNotEmpty()
  sourceChainId: string;

  @IsString()
  @IsNotEmpty()
  destChainId: string;

  @IsString()
  @IsNotEmpty()
  sourceToken: string;

  @IsString()
  @IsNotEmpty()
  destToken: string;

  @IsObject()
  @IsNotEmpty()
  sourceAmount: Amount;

  @IsString()
  @IsNotEmpty()
  maker: string;
}
