import { Module } from '@nestjs/common';
import { AsaasModule } from '../asaas/asaas.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AsaasWebhookController,
  ClientsController,
} from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [PrismaModule, AsaasModule],
  controllers: [ClientsController, AsaasWebhookController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}

