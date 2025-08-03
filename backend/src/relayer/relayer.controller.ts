import {
  Controller,
  Body,
  Param,
  Put,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { RelayerService } from './relayer.service';
import { OrderDocument } from 'src/orders/schemas/order.schema';

@Controller('relayer')
export class RelayerController {
  constructor(private readonly relayerService: RelayerService) {}

  @Put('share-secret/:orderHash')
  @HttpCode(HttpStatus.OK)
  async shareSecret(
    @Param('orderHash') orderHash: string,
    @Body('secret') secret: string,
  ): Promise<{ success: boolean }> {
    await this.relayerService.shareSecret(orderHash, secret);
    return { success: true };
  }
}
