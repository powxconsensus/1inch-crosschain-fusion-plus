import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Amount } from '../dto/create-order.dto';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'PENDING',
  SOURCE_ESCROW_CREATED = 'SOURCE_ESCROW_CREATED',
  DEST_ESCROW_CREATED = 'DEST_ESCROW_CREATED',
  SECRET_SHARED = 'SECRET_SHARED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',

  RESOLVER_SENT_DST_ESCROW_CREATED = 'RESOLVER_SENT_DST_ESCROW_CREATED',
  RESOLVER_SENT_DST_WITHDRAW_REQUESTED = 'RESOLVER_SENT_DST_WITHDRAW_REQUESTED',
  RESOLVER_SENT_SRC_WITHDRAW_REQUESTED = 'RESOLVER_SENT_SRC_WITHDRAW_REQUESTED',
}

@Schema()
export class Order {
  @Prop({ required: true })
  orderHash: string;

  @Prop({ required: true })
  hashLock: string;

  @Prop({ required: true })
  maker: string;

  @Prop({ required: true })
  taker: string;

  @Prop({ type: Object, required: true })
  sourceInfo: {
    chainId: string;
    token: string;
    amount: Amount;
    srcTxHash?: string;
    srcTimestamp?: string;
    escrowAddress?: string;
    timeLocks: string;
  };

  @Prop({ type: Object, required: true })
  destInfo: {
    chainId: string;
    token: string;
    amount: Amount;
    srcTxHash?: string;
    srcTimestamp?: string;
    escrowAddress?: string;
    timeLocks: string;
  };

  @Prop({ required: true, default: '0' })
  safetyDeposit: string;

  @Prop()
  secret?: string;

  @Prop({ required: true, enum: OrderStatus })
  status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
