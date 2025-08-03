import { Global, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GLOBAL_ID, GlobalDocument } from './schema/schema.schema';

@Injectable()
export class GlobalService {
  constructor(
    @InjectModel(Global.name)
    private globalModel: Model<GlobalDocument>,
  ) {}

  async getGlobalOrCreate(): Promise<GlobalDocument> {
    const global = await this.globalModel.findOne({
      id: GLOBAL_ID,
    });
    if (!global) return this.globalModel.create({ id: GLOBAL_ID });
    return global;
  }

  async updateGlobal(global: Partial<Global>): Promise<GlobalDocument> {
    const updatedGlobal = await this.globalModel.findOneAndUpdate(
      { id: GLOBAL_ID },
      { $set: global },
      { upsert: true },
    );
    if (!updatedGlobal) throw new Error('Global not found');
    return updatedGlobal as GlobalDocument;
  }
}
