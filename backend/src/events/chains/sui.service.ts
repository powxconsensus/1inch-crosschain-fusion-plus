import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { ChainsService } from 'src/chains/chains.service';
import { ChainConfig } from 'src/chains/chains.types';

@Injectable()
export class SuiEventsService {
  async getEvents(
    chainConfig: ChainConfig,
    minHeight: number,
    maxHeight: number,
  ): Promise<any[]> {
    return [];
  }
}
