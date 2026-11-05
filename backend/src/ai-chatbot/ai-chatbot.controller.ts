import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { Resource } from '../common/decorators/permissions.decorator';
import { AiChatbotService } from './ai-chatbot.service';
import { GEMINI_AVAILABLE_MODELS } from './ai-chatbot.constants';
import {
  TestAiChatbotPromptDto,
  UpdateAiChatbotConfigDto,
} from './dto/update-ai-config.dto';

@Resource('whatsapp')
@Controller('admin/ai-chatbot')
export class AiChatbotController {
  constructor(private readonly aiChatbotService: AiChatbotService) {}

  @Get('models')
  getAvailableModels() {
    return GEMINI_AVAILABLE_MODELS;
  }

  @Get('config')
  async getConfig() {
    return this.aiChatbotService.getConfig();
  }

  @Put('config')
  async updateConfig(@Body() dto: UpdateAiChatbotConfigDto) {
    return this.aiChatbotService.updateConfig(dto);
  }

  @Post('test')
  async testPrompt(@Body() dto: TestAiChatbotPromptDto) {
    const reply = await this.aiChatbotService.testPrompt(dto);
    return { reply };
  }
}
