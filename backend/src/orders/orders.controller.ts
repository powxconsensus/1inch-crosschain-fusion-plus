import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderRequestDto } from './dto/create-order.dto';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { ChainsService } from 'src/chains/chains.service';
import { QuoteDto } from './dto/quote.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { ethers } from 'ethers';
import { getChainConfigFromChainId } from 'src/chains/chains.constant';
import { TokenService } from '../tokens/token.service';
import Decimal from 'decimal.js';
import { ResolversService } from 'src/resolvers/resolvers.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly chainsService: ChainsService,
    private readonly tokenService: TokenService,
    private readonly resolversService: ResolversService,
  ) {}

  @Get('status/:orderHash')
  @HttpCode(HttpStatus.OK)
  async getOrderStatus(
    @Param('orderHash') orderHash: string,
  ): Promise<OrderDocument | null> {
    return await this.ordersService.findByOrderHash(orderHash);
  }

  @Post('quote')
  async quote(@Body() quoteDto: QuoteDto): Promise<QuoteResponseDto> {
    const {
      sourceChainId,
      destChainId,
      sourceToken,
      destToken,
      sourceAmount: inputSourceAmount,
      maker,
    } = quoteDto;

    const chainConfig = getChainConfigFromChainId(sourceChainId);
    if (!chainConfig.escrowFactoryAddress)
      throw new BadRequestException('Escrow factory address not found');

    // Get source token decimals and convert amount
    const sourceAmount = this.tokenService.convertToChainDecimalsAmount(
      inputSourceAmount,
      this.tokenService.getTokenDecimals(sourceChainId, sourceToken),
    );

    // Get token prices
    const sourceTokenSymbol = this.tokenService.getTokenSymbol(
      sourceChainId,
      sourceToken,
    );
    const destTokenSymbol = this.tokenService.getTokenSymbol(
      destChainId,
      destToken,
    );

    const fromTokenPriceUSD =
      this.tokenService.getTokenPrice(sourceTokenSymbol);
    const toTokenPriceUSD = this.tokenService.getTokenPrice(destTokenSymbol);
    const exchangeRate = toTokenPriceUSD.div(fromTokenPriceUSD);

    // Calculate total value in USD
    const totalValueUSD = new Decimal(sourceAmount.amount)
      .div(new Decimal(10).pow(sourceAmount.decimals))
      .mul(fromTokenPriceUSD);

    const destAmount = this.tokenService.calculateDestAmount(
      sourceAmount,
      fromTokenPriceUSD,
      toTokenPriceUSD,
      this.tokenService.getTokenDecimals(destChainId, destToken),
    );

    return {
      sourceChainId,
      destChainId,
      sourceToken,
      destToken,
      sourceAmount,
      maker,
      destAmount,
      escrowFactory: chainConfig.escrowFactoryAddress,
      fromTokenPriceUSD: fromTokenPriceUSD.toString(),
      toTokenPriceUSD: toTokenPriceUSD.toString(),
      exchangeRate: exchangeRate.toString(),
      totalValueUSD: totalValueUSD.toString(),
      estimatedFee: totalValueUSD.mul('0.1').toString(), // 10% fee
    };
  }

  @Post('create')
  async create(
    @Body() createOrderDto: CreateOrderRequestDto,
  ): Promise<QuoteResponseDto> {
    const now = Math.floor(Date.now() / 1000);
    const { hashLock } = createOrderDto;

    const chainConfig = getChainConfigFromChainId(
      createOrderDto.sourceInfo.chainId,
    );
    if (!chainConfig.escrowFactoryAddress)
      throw new BadRequestException('Escrow factory address not found');

    // Get source token decimals and convert amount
    const sourceAmount = this.tokenService.convertToChainDecimalsAmount(
      createOrderDto.sourceInfo.amount,
      this.tokenService.getTokenDecimals(
        createOrderDto.sourceInfo.chainId,
        createOrderDto.sourceInfo.token,
      ),
    );

    // Check balance and allowance with converted amount
    const { hasBalance, hasAllowance } =
      await this.chainsService.checkTokenBalanceAndAllowance(
        createOrderDto.sourceInfo.chainId,
        createOrderDto.sourceInfo.token,
        createOrderDto.maker,
        sourceAmount.amount,
        chainConfig.escrowFactoryAddress,
      );
    if (!hasBalance) throw new BadRequestException('Insufficient balance');
    if (!hasAllowance)
      throw new BadRequestException(
        'Token allowance not granted to escrow factory',
      );

    // Get factory contract
    const factory = this.chainsService.getEVMEscrowFactoryContract(
      createOrderDto.sourceInfo.chainId,
    );

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

    // Generate order hash and secret
    const orderHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256', 'bytes32'],
        [
          createOrderDto.maker,
          BigInt(sourceAmount.amount),
          BigInt(timelocks),
          hashLock,
        ],
      ),
    );

    const taker = this.resolversService.getResolverAddress(
      chainConfig.chainType,
    );
    // Create escrow immutables
    const immutables = {
      orderHash,
      hashlock: hashLock,
      maker: BigInt(createOrderDto.maker),
      taker: BigInt(taker),
      token: BigInt(createOrderDto.sourceInfo.token),
      amount: BigInt(sourceAmount.amount),
      safetyDeposit: BigInt(chainConfig.safetyDeposit || '0').toString(),
      timelocks,
    };
    console.log({
      immutables,
    });

    // Get token prices and calculate destination amount
    const sourceTokenSymbol = this.tokenService.getTokenSymbol(
      createOrderDto.sourceInfo.chainId,
      createOrderDto.sourceInfo.token,
    );
    const destTokenSymbol = this.tokenService.getTokenSymbol(
      createOrderDto.destInfo.chainId,
      createOrderDto.destInfo.token,
    );

    const fromTokenPriceUSD =
      this.tokenService.getTokenPrice(sourceTokenSymbol);
    const toTokenPriceUSD = this.tokenService.getTokenPrice(destTokenSymbol);

    const destAmount = this.tokenService.calculateDestAmount(
      sourceAmount,
      fromTokenPriceUSD,
      toTokenPriceUSD,
      this.tokenService.getTokenDecimals(
        createOrderDto.destInfo.chainId,
        createOrderDto.destInfo.token,
      ),
    );

    // Calculate total value in USD using Decimal
    const totalValueUSD = new Decimal(sourceAmount.amount)
      .div(new Decimal(10).pow(sourceAmount.decimals))
      .mul(fromTokenPriceUSD);

    await this.ordersService.create({
      orderHash,
      hashLock,
      maker: createOrderDto.maker,
      taker: taker,
      sourceInfo: {
        ...createOrderDto.sourceInfo,
        amount: sourceAmount,
        timeLocks: timelocks.toString(),
      },
      destInfo: {
        ...createOrderDto.destInfo,
        amount: destAmount,
      },
      safetyDeposit: chainConfig.safetyDeposit || '0',
      timeLocks: timelocks.toString(),
      status: OrderStatus.PENDING,
    });

    return {
      orderHash,
      sourceAmount,
      maker: createOrderDto.maker,
      sourceToken: createOrderDto.sourceInfo.token,
      sourceChainId: createOrderDto.sourceInfo.chainId,
      destToken: createOrderDto.destInfo.token,
      destChainId: createOrderDto.destInfo.chainId.toString(),
      destAmount,
      escrowFactory: chainConfig.escrowFactoryAddress,
      fromTokenPriceUSD: fromTokenPriceUSD.toString(),
      toTokenPriceUSD: toTokenPriceUSD.toString(),
      exchangeRate: toTokenPriceUSD.div(fromTokenPriceUSD).toString(),
      totalValueUSD: totalValueUSD.toString(),
      estimatedFee: totalValueUSD.mul('0.1').toString(), // 10% fee
      calldata: {
        data: factory.interface.encodeFunctionData('createSrcEscrow', [
          immutables,
        ]),
        value: immutables.safetyDeposit,
        to: chainConfig.escrowFactoryAddress,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findById(id);
  }
}
