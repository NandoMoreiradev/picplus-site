import { Module } from '@nestjs/common';
import { AiChatbotModule } from '../ai-chatbot/ai-chatbot.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignPlannerController } from './campaign-planner.controller';
import { CampaignPlannerService } from './campaign-planner.service';
import { ClientAiController } from './client-ai.controller';
import { ClientAiService } from './client-ai.service';
import { ExtensionIngestController } from './extension-ingest.controller';
import { LandingPagesPublicController } from './landing-pages-public.controller';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './landing-pages.service';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';

@Module({
  imports: [PrismaModule, AiChatbotModule],
  controllers: [
    ClientAiController,
    CampaignPlannerController,
    LandingPagesController,
    LandingPagesPublicController,
    ResearchController,
    ExtensionIngestController,
  ],
  providers: [
    ClientAiService,
    CampaignPlannerService,
    LandingPagesService,
    ResearchService,
  ],
  exports: [
    ClientAiService,
    CampaignPlannerService,
    LandingPagesService,
    ResearchService,
  ],
})
export class ClientAiModule {}
