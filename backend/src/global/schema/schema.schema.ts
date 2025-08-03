import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type GlobalDocument = mongoose.HydratedDocument<Global>;

export const GLOBAL_ID = 'resolver-indexer';
@Schema()
export class Global {
  @Prop({ unique: true, default: GLOBAL_ID })
  id: string;

  @Prop({
    type: Object,
    default: {},
  })
  chain: {
    [key: string]: {
      escrowFactory: {
        startBlock: number;
        processBlock: number;
        processDelay: number;
        escrowFactoryAddress: string;
      };
    };
  };
}

export const GlobalSchema = SchemaFactory.createForClass(Global);
