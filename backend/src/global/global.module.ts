import { Module } from '@nestjs/common';
import { GlobalService } from './global.service';
import { Global, GlobalSchema } from './schema/schema.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Global.name, schema: GlobalSchema }]),
  ],
  controllers: [],
  providers: [GlobalService],
  exports: [GlobalService],
})
export class GlobalModule {}
