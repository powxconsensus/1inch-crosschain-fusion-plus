import { Injectable } from '@nestjs/common';
import { GlobalService } from './global/global.service';
import { GlobalDocument } from './global/schema/schema.schema';
import { CHAIN_CONFIGS } from './chains/chains.constant';
import { EventsService } from './events/events.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Chain } from './chains/chains.types';
import { OrdersService } from './orders/orders.service';
import { ResolversService } from './resolvers/resolvers.service';

@Injectable()
export class AppService {
  global: GlobalDocument;
  listening: boolean;
  processing: boolean;
  private lastListenTime: number = 0;
  private lastProcessTime: number = 0;
  private readonly MIN_INTERVAL_LISTEN = 5000; // 5 seconds in milliseconds
  private readonly MIN_INTERVAL_PROCESS = 1000; // 1 second in milliseconds

  constructor(
    private readonly globalService: GlobalService,
    private readonly eventService: EventsService,
    private readonly orderService: OrdersService,
    private readonly resolversService: ResolversService,
  ) {
    const chainConfigs = Object.values(CHAIN_CONFIGS).map((chainConfig) => {
      return {
        chainId: chainConfig.chainId,
        escrowFactoryAddress: chainConfig.escrowFactoryAddress,
        startBlock: chainConfig.startBlock,
        processDelay: chainConfig.processDelay,
      };
    });

    (async () => {
      this.global = await this.globalService.getGlobalOrCreate();
      const mp: Record<
        string,
        {
          escrowFactory: {
            startBlock: number;
            processBlock: number;
            processDelay: number;
            escrowFactoryAddress: string;
          };
        }
      > = {};
      // insert excrow if not already exists from chain config
      for (const chainConfig of chainConfigs) {
        if (
          !this.global.chain[chainConfig.chainId] &&
          chainConfig.escrowFactoryAddress
        )
          this.global.chain[chainConfig.chainId] = {
            escrowFactory: {
              startBlock: chainConfig.startBlock,
              processBlock: chainConfig.startBlock,
              processDelay: chainConfig.processDelay,
              escrowFactoryAddress: chainConfig.escrowFactoryAddress,
            },
          };
      }
      await this.globalService.updateGlobal(this.global as any);
    })();

    setTimeout(async () => {}, 2000);
  }

  onModuleInit() {
    // this.startListening();
  }

  async listenAndProcessEvents() {
    const logs: any[] = [];
    for (const id of Object.keys(CHAIN_CONFIGS)) {
      const chainConfig = CHAIN_CONFIGS[id as Chain];
      const { logs: _logs, lastesBlockNumber } =
        await this.eventService.getEvents(
          chainConfig,
          this.global.chain[chainConfig.chainId].escrowFactory.processBlock,
          100,
        );
      if (_logs) logs.push(..._logs);
      this.global.chain[chainConfig.chainId].escrowFactory.processBlock =
        lastesBlockNumber;
    }
    logs.sort((a, b) => a.timestamp - b.timestamp);

    for (const log of logs) {
      console.log(
        `[${log.chainConfig.name}] : ${log.eventType}: ${log.txHash}`,
      );
      switch (log.eventType) {
        case 'SrcEscrowCreated':
          await this.orderService.handleSrcEscrowCreated(log);
          break;
        case 'DstEscrowCreated':
          console.log(log);

          await this.orderService.handleDstEscrowCreated(log);
          break;
      }
    }

    await this.globalService.updateGlobal(this.global as any);
  }

  // @Cron(CronExpression.EVERY_5_SECONDS, {
  //   name: 'LISTEN_FOR_EVENTS',
  // }) //EVERY_10_SECONDS
  // async listenForEvents() {
  //   const now = Date.now();
  //   if (
  //     this.listening ||
  //     now - this.lastListenTime < this.MIN_INTERVAL_LISTEN
  //   ) {
  //     console.log('Skipping listen: Already running or too soon');
  //     return;
  //   }

  //   try {
  //     this.listening = true;
  //     this.lastListenTime = now;
  //     this.global = await this.globalService.getGlobalOrCreate();
  //     if (this.global) await this.listenAndProcessEvents();
  //   } catch (error) {
  //     console.error('Error in listenForEvents:', error);
  //   } finally {
  //     this.listening = false;
  //   }
  // }

  @Cron(CronExpression.EVERY_SECOND, {
    name: 'PROCESS_ORDERS',
  }) //EVERY_10_SECONDS
  async processOrders() {
    const now = Date.now();
    if (
      this.processing ||
      now - this.lastProcessTime < this.MIN_INTERVAL_PROCESS
    ) {
      console.log('Skipping process: Already running or too soon');
      return;
    }

    try {
      this.processing = true;
      this.lastProcessTime = now;
      if (this.global) await this.resolversService.processOrders();
    } catch (error) {
      console.error('Error in processOrders:', error);
    } finally {
      this.processing = false;
    }
  }
}
