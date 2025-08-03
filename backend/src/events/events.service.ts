import { Injectable } from '@nestjs/common';
import { ChainsService } from 'src/chains/chains.service';
import { ChainConfig, ChainType } from 'src/chains/chains.types';
import { EVMEventsService } from './chains/evm.service';
import { SuiEventsService } from './chains/sui.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly evmEventsService: EVMEventsService,
    private readonly suiEventsService: SuiEventsService,
    private readonly chainsService: ChainsService,
  ) {}

  async getEvents(
    chainConfig: ChainConfig,
    startBlock: number,
    maxRange: number,
  ): Promise<any> {
    if (chainConfig.chainType == ChainType.EVM)
      return await this.evmEventsService.getEvents(
        chainConfig,
        startBlock,
        maxRange,
      );
    else
      return await this.suiEventsService.getEvents(
        chainConfig,
        startBlock,
        maxRange,
      );
  }
}
