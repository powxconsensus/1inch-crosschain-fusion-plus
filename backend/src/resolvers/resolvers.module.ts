import { Module } from '@nestjs/common';
import { ResolversController } from './resolvers.controller';
import { ResolversService } from './resolvers.service';
import { OrdersService } from 'src/orders/orders.service';
import { Order, OrderSchema } from 'src/orders/schemas/order.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ChainsService } from 'src/chains/chains.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [ResolversController],
  providers: [ResolversService, OrdersService, ChainsService, ConfigService],
  exports: [ResolversService],
})
export class ResolversModule {}
