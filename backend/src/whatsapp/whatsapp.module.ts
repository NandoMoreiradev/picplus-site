import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { AiChatbotModule } from '../ai-chatbot/ai-chatbot.module';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { MetaApiService } from './meta-api.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { WhatsappMessageProcessorService } from './whatsapp-message-processor.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    PrismaModule,
    AiChatbotModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    MetaApiService,
    WhatsappGateway,
    WhatsappMessageProcessorService,
  ],
  exports: [WhatsappService, WhatsappGateway],
})
export class WhatsappModule {}
