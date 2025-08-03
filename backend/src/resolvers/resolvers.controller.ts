import { Controller } from '@nestjs/common';
import { ResolversService } from './resolvers.service';

@Controller('resolvers')
export class ResolversController {
  constructor(private readonly resolversService: ResolversService) {}
}
