import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsEnum,
} from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class Amount {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsNumber()
  @IsNotEmpty()
  decimals: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  orderHash: string;

  @IsString()
  @IsNotEmpty()
  hashLock: string;

  @IsString()
  maker: string;

  @IsString()
  taker: string;

  @IsObject()
  sourceInfo: {
    chainId: string;
    token: string;
    amount: Amount;
    srcTxHash?: string;
    srcTimestamp?: string;
    escrowAddress?: string;
    timeLocks?: string;
  };

  @IsObject()
  destInfo: {
    chainId: string;
    token: string;
    amount: Amount;
    srcTxHash?: string;
    srcTimestamp?: string;
    escrowAddress?: string;
    timeLocks?: string;
  };

  @IsString()
  safetyDeposit: string;

  @IsString()
  @IsNotEmpty()
  timeLocks: string;

  @IsString()
  @IsNotEmpty()
  secret?: string;

  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}

export class UpdateOrderDto {
  @IsObject()
  sourceInfo: {
    chainId: string;
    token: string;
    amount: string;
    decimals: number;
    srcTxHash?: string;
    srcTimestamp?: string;
    escrowAddress?: string;
    timeLocks?: string;
  };

  @IsObject()
  destInfo: {
    chainId: string;
    token: string;
    amount: string;
    decimals: number;
    srcTxHash?: string;
    srcTimestamp?: string;
    escrowAddress?: string;
    timeLocks?: string;
  };

  @IsString()
  @IsNotEmpty()
  timeLocks?: string;

  @IsString()
  @IsNotEmpty()
  secret?: string;

  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status?: OrderStatus;
}

export class CreateOrderRequestDto {
  @IsString()
  @IsNotEmpty()
  hashLock: string;

  @IsString()
  maker: string;

  @IsObject()
  sourceInfo: {
    chainId: string;
    token: string;
    amount: Amount;
  };

  @IsObject()
  destInfo: {
    chainId: string;
    token: string;
    amount: Amount;
  };
}
