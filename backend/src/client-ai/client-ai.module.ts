import { Module } from '@nestjs/common';
import { AiChatbotModule } from '../ai-chatbot/ai-chatbot.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignPlannerController } from './campaign-planner.controller';
import { CampaignPlannerService } from './campaign-planner.service';
import { ClientAiController } from './client-ai.controller';
import { ClientAiService } from './client-ai.service';

@Module({
  imports: [PrismaModule, AiChatbotModule],
  controllers: [ClientAiController, CampaignPlannerController],
  providers: [ClientAiService, CampaignPlannerService],
  exports: [ClientAiService, CampaignPlannerService],
})
export class ClientAiModule {}
