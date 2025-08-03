import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { SuiEventsService } from './chains/sui.service';
import { EVMEventsService } from './chains/evm.service';
import { ChainsService } from 'src/chains/chains.service';

@Module({
  imports: [],
  controllers: [],
  providers: [EventsService, ChainsService, EVMEventsService, SuiEventsService],
  exports: [EventsService],
})
export class EventsModule {}
