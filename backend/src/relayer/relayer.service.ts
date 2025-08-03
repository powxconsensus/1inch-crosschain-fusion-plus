import { Injectable } from '@nestjs/common';
import { ChainsService } from 'src/chains/chains.service';
import { ChainConfig, ChainType } from 'src/chains/chains.types';
import { OrdersService } from 'src/orders/orders.service';
import { OrderDocument } from 'src/orders/schemas/order.schema';

@Injectable()
export class RelayerService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly chainsService: ChainsService,
  ) {}

  async shareSecret(orderHash: string, secret: string): Promise<void> {
    await this.ordersService.shareSecret(orderHash, secret);
  }

  async getOrderByHash(orderHash: string): Promise<OrderDocument | null> {
    return await this.ordersService.findByOrderHash(orderHash);
  }
}
