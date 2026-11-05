import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Resource } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { WhatsappService } from './whatsapp.service';
import { WhatsappMessageProcessorService } from './whatsapp-message-processor.service';
import {
  CreateConversationNoteDto,
  ListConversationsQueryDto,
  SendAgentMessageDto,
  UpdateChannelConfigDto,
  UpdateConversationStatusDto,
} from './dto/whatsapp.dto';
import type { MetaWebhookPayload } from './dto/meta-webhook.dto';

@Controller()
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly processor: WhatsappMessageProcessorService,
  ) {}

  /**
   * Endpoint público de verificação do Webhook da Meta.
   */
  @Public()
  @Get('whatsapp/webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const channel = await this.whatsappService.getChannelConfig();
    const expectedToken = channel?.verifyToken || 'picplus_secret_verify_token';

    if (mode === 'subscribe' && token === expectedToken) {
      return challenge;
    }

    throw new ForbiddenException('Token de verificação inválido.');
  }

  /**
   * Endpoint público que recebe eventos do WhatsApp enviados pela Meta.
   */
  @Public()
  @HttpCode(200)
  @Post('whatsapp/webhook')
  async handleWebhook(@Body() payload: MetaWebhookPayload) {
    await this.processor.processWebhook(payload);
    return { status: 'EVENT_RECEIVED' };
  }

  // ─────────────────────────────────────────────────────────────
  // Painel Administrativo
  // ─────────────────────────────────────────────────────────────

  @Resource('whatsapp')
  @Get('admin/whatsapp/counts')
  async getCounts() {
    return this.whatsappService.getCounts();
  }

  @Resource('whatsapp')
  @Get('admin/whatsapp/conversations')
  async listConversations(@Query() query: ListConversationsQueryDto) {
    return this.whatsappService.listConversations(query);
  }

  @Resource('whatsapp')
  @Get('admin/whatsapp/conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.whatsappService.getConversation(id);
  }

  @Resource('whatsapp')
  @Post('admin/whatsapp/conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendAgentMessageDto,
  ) {
    return this.whatsappService.sendAgentMessage(id, user.sub, dto);
  }

  @Resource('whatsapp')
  @Patch('admin/whatsapp/conversations/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.whatsappService.updateStatus(id, dto);
  }

  @Resource('whatsapp')
  @Post('admin/whatsapp/conversations/:id/notes')
  async addNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConversationNoteDto,
  ) {
    return this.whatsappService.addNote(id, user.sub, dto);
  }

  @Resource('whatsapp')
  @Get('admin/whatsapp/channel')
  async getChannel() {
    return this.whatsappService.getChannelConfig();
  }

  @Resource('whatsapp')
  @Put('admin/whatsapp/channel')
  async updateChannel(@Body() dto: UpdateChannelConfigDto) {
    return this.whatsappService.updateChannelConfig(dto);
  }
}
