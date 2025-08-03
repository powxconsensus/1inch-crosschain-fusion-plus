import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChainsService } from 'src/chains/chains.service';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { QuoteDto } from './dto/quote.dto';
import { DstEscrowCreated, SrcEscrowCreated } from 'src/events/events.types';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly chainsService: ChainsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = new this.orderModel({
      ...createOrderDto,
      status: OrderStatus.PENDING,
    });
    return order.save();
  }

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel.find().exec();
  }

  async find(query: any): Promise<OrderDocument[]> {
    return this.orderModel.find(query).exec();
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  async findByOrderHash(orderHash: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ orderHash }).exec();
  }

  async shareSecret(orderHash: string, secret: string): Promise<void> {
    await this.orderModel
      .findOneAndUpdate({ orderHash }, { $set: { secret } })
      .exec();
  }

  async updateByOrderHash(
    orderHash: string,
    update: Partial<Order>,
  ): Promise<OrderDocument | null> {
    return this.orderModel.findOneAndUpdate({ orderHash }, update).exec();
  }
  async handleSrcEscrowCreated(log: SrcEscrowCreated) {
    const order = await this.orderModel
      .findOne({
        orderHash: log.orderHash,
        status: OrderStatus.PENDING,
      })
      .exec();
    if (!order) {
      return console.log(
        'order not found or already processed {:?}',
        log.orderHash,
      );
    }

    order.sourceInfo = {
      ...order.sourceInfo,
      escrowAddress: log.escrow,
      srcTxHash: log.txHash,
      srcTimestamp: log.timestamp.toString(),
      timeLocks: log.timelocks,
    };
    order.markModified('sourceInfo');

    order.status = OrderStatus.SOURCE_ESCROW_CREATED;
    await order.save();
  }

  async handleDstEscrowCreated(log: DstEscrowCreated) {
    const order = await this.orderModel
      .findOne({
        orderHash: log.orderHash,
        status: OrderStatus.RESOLVER_SENT_DST_ESCROW_CREATED,
      })
      .exec();

    if (!order) {
      return console.log(
        'order not found or already processed {:?}',
        log.orderHash,
      );
    }

    order.destInfo = {
      ...order.destInfo,
      escrowAddress: log.escrow,
      srcTxHash: log.txHash,
      srcTimestamp: log.timestamp.toString(),
      timeLocks: log.timelocks,
    };
    order.markModified('destInfo');
    console.log(order);

    order.status = OrderStatus.DEST_ESCROW_CREATED;
    await order.save();
  }
}
