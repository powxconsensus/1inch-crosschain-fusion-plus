import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { ChainsService } from 'src/chains/chains.service';
import { TokenService } from 'src/tokens/token.service';
import { ResolversModule } from 'src/resolvers/resolvers.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ResolversModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ChainsService, TokenService],
  exports: [OrdersService],
})
export class OrdersModule {}
