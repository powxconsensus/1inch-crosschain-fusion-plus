import { Injectable } from '@nestjs/common';
import { getChainConfigFromChainId } from 'src/chains/chains.constant';
import { ethers, Log } from 'ethers';
import * as ESCROW_FACTORY_ABI from '../../artifacts/evm/escrow.factory.json';
import { DstEscrowCreated, SrcEscrowCreated } from '../events.types';
import { ChainConfig } from 'src/chains/chains.types';

export const allEvmEvents = [
  'SrcEscrowCreated((bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,uint256),address)',
  'DstEscrowCreated(bytes32,address,bytes32,uint256,uint256)',
];

@Injectable()
export class EVMEventsService {
  private filters: any;
  public events: { [event: string]: string } = {}; // eventid -> topics
  public topics: string[] = [];

  constructor() {
    allEvmEvents.map((ename) => {
      const topic = ethers.id(ename);
      const fname = ename.split('(')[0];
      this.events[topic] = fname;
    });
    this.topics = allEvmEvents.map((ename) => ethers.id(ename));
    console.log(this.topics);
  }

  async getEvents(
    chainConfig: ChainConfig,
    startBlock: number,
    maxRange: number,
  ): Promise<any> {
    const logs: any[] = [];
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);

    let lastesBlockNumber = await provider.getBlockNumber();
    if (startBlock + maxRange <= lastesBlockNumber) {
      lastesBlockNumber = startBlock + maxRange;
    }
    if (startBlock > lastesBlockNumber)
      return {
        logs: [],
        lastesBlockNumber: startBlock,
      };

    console.log(
      `| ${chainConfig.name} | Fetching  Events - StartBlock: ${startBlock} - EndBlock ${lastesBlockNumber}`,
    );

    const contract = new ethers.Contract(
      chainConfig.escrowFactoryAddress!,
      ESCROW_FACTORY_ABI,
      provider,
    );

    const events: (Event | Log)[] = await provider.getLogs({
      address: chainConfig.escrowFactoryAddress!,
      topics: [this.topics],
      fromBlock: startBlock,
      toBlock: lastesBlockNumber,
    });

    await Promise.all(
      events.map(async (dispatch: Log) => {
        const topic = dispatch.topics[0];
        switch (this.events[topic]) {
          case 'SrcEscrowCreated':
            logs.push(
              await this.decodeSrcEscrowCreated(dispatch, {
                chainConfig,
              }),
            );
            break;
          case 'DstEscrowCreated':
            logs.push(
              await this.decodeDstEscrowCreated(dispatch, {
                chainConfig,
              }),
            );
            break;
        }
      }),
    );
    return { logs, lastesBlockNumber };
  }

  async decodeSrcEscrowCreated(
    event: Log,
    { chainConfig }: { chainConfig: ChainConfig },
  ): Promise<SrcEscrowCreated> {
    const [tuple, escrow] = ethers.AbiCoder.defaultAbiCoder().decode(
      ['(bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,uint256)'],
      event.data,
    )[0];

    const { timestamp } = await event.getBlock();

    return {
      orderHash: tuple.toString(),
      hashlock: tuple.toString(),
      maker: toAddressFromUint256(tuple.toString()),
      taker: toAddressFromUint256(tuple.toString()),
      token: toAddressFromUint256(tuple.toString()),
      amount: tuple.toString(),
      safetyDeposit: tuple.toString(),
      timelocks: tuple.toString(),
      escrow: escrow.toString(),
      txHash: event.transactionHash,
      timestamp,
      eventType: 'SrcEscrowCreated',
      chainConfig,
    };
  }

  async decodeDstEscrowCreated(
    event: Log,
    { chainConfig }: { chainConfig: ChainConfig },
  ): Promise<DstEscrowCreated> {
    const data = ethers.AbiCoder.defaultAbiCoder().decode(
      [
        'bytes32 orderHash',
        'address escrow',
        'bytes32 hashlock',
        'uint256 taker',
        'uint256 timelocks',
      ],
      event.data,
    );

    const { timestamp } = await event.getBlock();

    return {
      orderHash: data[0].toString(),
      escrow: data[1].toString(),
      hashlock: data[2].toString(),
      taker: data[3].toString().toLowerCase(),
      timelocks: data[4].toString(),
      txHash: event.transactionHash,
      timestamp,
      eventType: 'DstEscrowCreated',
      chainConfig,
    };
  }
}

export function toAddressFromUint256(uint256: string) {
  // Convert BigInt to hex, and zero-pad to 32 bytes
  const fullHex = ethers.zeroPadValue(ethers.toBeHex(uint256), 32);
  // Slice the last 20 bytes (rightmost 40 hex chars)
  const evmAddressBytes = fullHex.slice(-40);
  // Format as checksum address
  return ethers.getAddress('0x' + evmAddressBytes);
}
