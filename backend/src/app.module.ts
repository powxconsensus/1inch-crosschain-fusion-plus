import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { RelayerModule } from './relayer/relayer.module';
import { ResolversModule } from './resolvers/resolvers.module';
import { ChainsService } from './chains/chains.service';
import { EventsModule } from './events/events.module';
import { GlobalModule } from './global/global.module';
import { TokenModule } from './tokens/token.module';
import { ChainsModule } from './chains/chains.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/fusion-plus',
    ),
    GlobalModule,
    ChainsModule,
    EventsModule,
    TokenModule,
    OrdersModule,
    EventsModule,
    ResolversModule,
    RelayerModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChainsService],
})
export class AppModule {}
