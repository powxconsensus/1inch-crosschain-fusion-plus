import { Module } from '@nestjs/common';
import { RelayerService } from './relayer.service';
import { RelayerController } from './relayer.controller';
import { OrdersService } from 'src/orders/orders.service';
import { ChainsService } from 'src/chains/chains.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [RelayerController],
  providers: [OrdersService, ChainsService, RelayerService],
  exports: [RelayerService],
})
export class RelayerModule {}
