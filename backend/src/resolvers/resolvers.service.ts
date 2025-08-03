import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { getChainConfigFromChainId } from 'src/chains/chains.constant';
import { ChainsService } from 'src/chains/chains.service';
import { ChainType } from 'src/chains/chains.types';
import { OrdersService } from 'src/orders/orders.service';
import { OrderDocument, OrderStatus } from 'src/orders/schemas/order.schema';
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
import * as ESCROW_FACTORY_ABI from '../artifacts/evm/escrow.factory.json';
import * as SRC_ESCROW_ABI from '../artifacts/evm/src_escrow.json';
import * as DST_ESCROW_ABI from '../artifacts/evm/dst_escrow.json';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
];

@Injectable()
export class ResolversService {
  privateKey: string;
  evm: {
    instance: ethers.Contract;
    evmSigner: ethers.Wallet;
    srcEscrow: ethers.Contract;
    dstEscrow: ethers.Contract;
  };
  sui: {
    signer: typeof Ed25519Keypair;
  };

  constructor(
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
    private readonly chainsService: ChainsService,
  ) {
    this.privateKey = this.config.get('PRIVATE_KEY') || '';
    if (!this.privateKey) throw new Error('PRIVATE_KEY is not set');

    if (!this.evm)
      this.evm = {
        instance: new ethers.Contract(ethers.ZeroAddress, ESCROW_FACTORY_ABI),
        evmSigner: new ethers.Wallet(this.privateKey),
        srcEscrow: new ethers.Contract(ethers.ZeroAddress, SRC_ESCROW_ABI),
        dstEscrow: new ethers.Contract(ethers.ZeroAddress, DST_ESCROW_ABI),
      };

    if (!this.sui)
      this.sui = {
        signer: Ed25519Keypair.fromSecretKey(
          ethers.getBytes(
            this.privateKey.startsWith('0x')
              ? this.privateKey
              : `0x${this.privateKey}`,
          ),
        ),
      };
  }

  getResolverAddress(chainType: ChainType) {
    switch (chainType) {
      case ChainType.EVM:
        return this.evm.evmSigner.address;
      case ChainType.SUI:
        return this.sui.signer.getPublicKey().toSuiAddress();
      default:
        throw new Error('Unsupported chain type');
    }
  }

  async processOrders() {
    const orders = await this.ordersService.find({
      status: {
        $in: [
          OrderStatus.SOURCE_ESCROW_CREATED,
          OrderStatus.DEST_ESCROW_CREATED, // wait untill secret is shared
          OrderStatus.SECRET_SHARED, // withdraw dst and src escrow within time
        ],
      },
    });

    for (const order of orders) {
      switch (order.status) {
        case OrderStatus.SOURCE_ESCROW_CREATED:
          await this.deployDstEscrow(order);
          break;
        case OrderStatus.DEST_ESCROW_CREATED:
          console.log('wait for secret to be shared: ', order.orderHash);
          break;
        case OrderStatus.SECRET_SHARED:
          await this.withdrawDstEscrow(order);
          await this.withdrawSrcEscrow(order);
          break;
      }
    }
  }

  async deployDstEscrow(order: OrderDocument) {
    const chainConfig = getChainConfigFromChainId(order.destInfo.chainId);
    if (!chainConfig.escrowFactoryAddress) {
      throw new BadRequestException(
        `Escrow factory address not found for chain ${order.destInfo.chainId}`,
      );
    }

    switch (chainConfig.chainType) {
      case ChainType.EVM: {
        // Check resolver's balance and allowance
        const { hasBalance, hasAllowance } =
          await this.chainsService.checkTokenBalanceAndAllowance(
            order.destInfo.chainId,
            order.destInfo.token,
            this.evm.evmSigner.address,
            order.destInfo.amount.amount,
            chainConfig.escrowFactoryAddress,
          );

        if (!hasBalance) {
          throw new BadRequestException(
            `Resolver doesn't have enough balance of ${order.destInfo.token} on chain ${order.destInfo.chainId}`,
          );
        }

        if (!hasAllowance) {
          // Get token contract
          const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
          const tokenContract = new ethers.Contract(
            order.destInfo.token,
            ERC20_ABI,
            this.evm.evmSigner.connect(provider),
          );

          // Approve escrow factory
          const approveTx = await tokenContract.approve(
            chainConfig.escrowFactoryAddress,
            ethers.MaxUint256,
          );
          await approveTx.wait(1);

          console.log(
            'Approved escrow factory for token:',
            order.destInfo.token,
          );
        }

        // 2nd step now on
        const now = Math.floor(Date.now() / 1000);

        // Create timelock values
        const dstWithdrawal = 30; // 30sec
        const dstPublicWithdrawal = 120; // 2 min
        const dstCancellation = 1800; // 30 min

        // Pack timelocks
        const timelocks =
          (BigInt(now) << 224n) |
          (BigInt(dstCancellation) << 64n) |
          (BigInt(dstPublicWithdrawal) << 32n) |
          BigInt(dstWithdrawal);

        // Create escrow immutables
        const immutables = {
          orderHash: order.orderHash,
          hashlock: order.hashLock,
          maker: BigInt(order.maker),
          taker: BigInt(order.taker),
          token: BigInt(order.destInfo.token),
          amount: BigInt(order.destInfo.amount.amount),
          safetyDeposit: BigInt(chainConfig.safetyDeposit || '0').toString(),
          timelocks,
        };

        //todo: get src cancellation timestamp
        const srcCancellationTimestamp = Number.MAX_SAFE_INTEGER.toString();

        const calldata = {
          data: this.evm.instance.interface.encodeFunctionData(
            'createDstEscrow',
            [immutables, srcCancellationTimestamp],
          ),
          value: immutables.safetyDeposit,
          to: chainConfig.escrowFactoryAddress,
        };
        const tx = await this.evm.evmSigner
          .connect(new ethers.JsonRpcProvider(chainConfig.rpcUrl))
          .sendTransaction({
            ...calldata,
            gasLimit: 6000000,
            gasPrice: ethers.parseUnits('10', 'gwei'),
          });
        await tx.wait();
        console.log(tx);

        await this.ordersService.updateByOrderHash(immutables.orderHash, {
          status: OrderStatus.RESOLVER_SENT_DST_ESCROW_CREATED,
        });
        break;
      }
      case ChainType.SUI: {
        const packageId = ethers
          .getBytes(chainConfig.escrowFactoryAddress!)
          .slice(0, 32);
        const objectId = ethers
          .getBytes(chainConfig.escrowFactoryAddress!)
          .slice(32, 64);
        console.log('ss');

        break;
      }
    }
  }

  async withdrawDstEscrow(order: OrderDocument) {
    const chainConfig = getChainConfigFromChainId(order.destInfo.chainId);
    if (!chainConfig.escrowFactoryAddress) {
      throw new BadRequestException(
        `Escrow factory address not found for chain ${order.destInfo.chainId}`,
      );
    }

    switch (chainConfig.chainType) {
      case ChainType.EVM: {
        // Create escrow immutables
        const immutables = {
          orderHash: order.orderHash,
          hashlock: order.hashLock,
          maker: BigInt(order.maker),
          taker: BigInt(order.taker),
          token: BigInt(order.destInfo.token),
          amount: BigInt(order.destInfo.amount.amount),
          safetyDeposit: BigInt(chainConfig.safetyDeposit || '0').toString(),
          timelocks: order.destInfo.timeLocks,
        };

        const calldata = {
          data: this.evm.dstEscrow.interface.encodeFunctionData('withdraw', [
            order.secret,
            immutables,
          ]),
          value: 0,
          to: order.destInfo.escrowAddress,
        };
        const tx = await this.evm.evmSigner
          .connect(new ethers.JsonRpcProvider(chainConfig.rpcUrl))
          .sendTransaction({
            ...calldata,
            gasLimit: 6000000,
            gasPrice: ethers.parseUnits('10', 'gwei'),
          });
        await tx.wait();
        console.log(tx);

        await this.ordersService.updateByOrderHash(immutables.orderHash, {
          status: OrderStatus.RESOLVER_SENT_DST_ESCROW_CREATED,
        });
        break;
      }
      case ChainType.SUI: {
        const packageId = ethers
          .getBytes(chainConfig.escrowFactoryAddress!)
          .slice(0, 32);
        const objectId = ethers
          .getBytes(chainConfig.escrowFactoryAddress!)
          .slice(32, 64);
        console.log('ss');

        break;
      }
    }
  }

  async withdrawSrcEscrow(order: OrderDocument) {
    console.log('WITHDRAW');

    const chainConfig = getChainConfigFromChainId(order.destInfo.chainId);
    if (!chainConfig.escrowFactoryAddress) {
      throw new BadRequestException(
        `Escrow factory address not found for chain ${order.destInfo.chainId}`,
      );
    }

    switch (chainConfig.chainType) {
      case ChainType.EVM: {
        // Create escrow immutables
        const immutables = {
          orderHash: order.orderHash,
          hashlock: order.hashLock,
          maker: BigInt(order.maker),
          taker: BigInt(order.taker),
          token: BigInt(order.sourceInfo.token),
          amount: BigInt(order.sourceInfo.amount.amount),
          safetyDeposit: BigInt(chainConfig.safetyDeposit || '0').toString(),
          timelocks: order.sourceInfo.timeLocks,
        };

        const calldata = {
          data: this.evm.instance.interface.encodeFunctionData('withdraw', [
            order.secret,
            immutables,
          ]),
          value: 0,
          to: order.sourceInfo.escrowAddress,
        };
        const tx = await this.evm.evmSigner
          .connect(new ethers.JsonRpcProvider(chainConfig.rpcUrl))
          .sendTransaction({
            ...calldata,
            gasLimit: 6000000,
            gasPrice: ethers.parseUnits('10', 'gwei'),
          });
        await tx.wait();
        console.log(tx);

        await this.ordersService.updateByOrderHash(immutables.orderHash, {
          status: OrderStatus.RESOLVER_SENT_DST_ESCROW_CREATED,
        });
        break;
        break;
      }
      case ChainType.SUI: {
        const packageId = ethers
          .getBytes(chainConfig.escrowFactoryAddress!)
          .slice(0, 32);
        const objectId = ethers
          .getBytes(chainConfig.escrowFactoryAddress!)
          .slice(32, 64);
        console.log('ss');

        break;
      }
    }
  }
}
