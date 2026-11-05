import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiChatbotService } from './ai-chatbot.service';
import { AiChatbotController } from './ai-chatbot.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AiChatbotController],
  providers: [AiChatbotService],
  exports: [AiChatbotService],
})
export class AiChatbotModule {}
