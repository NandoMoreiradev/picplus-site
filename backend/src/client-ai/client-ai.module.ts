import { Module } from '@nestjs/common';
import { AiChatbotModule } from '../ai-chatbot/ai-chatbot.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignPlannerController } from './campaign-planner.controller';
import { CampaignPlannerService } from './campaign-planner.service';
import { ClientAiController } from './client-ai.controller';
import { ClientAiService } from './client-ai.service';
import { LandingPagesPublicController } from './landing-pages-public.controller';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './landing-pages.service';

@Module({
  imports: [PrismaModule, AiChatbotModule],
  controllers: [
    ClientAiController,
    CampaignPlannerController,
    LandingPagesController,
    LandingPagesPublicController,
  ],
  providers: [ClientAiService, CampaignPlannerService, LandingPagesService],
  exports: [ClientAiService, CampaignPlannerService, LandingPagesService],
})
export class ClientAiModule {}
