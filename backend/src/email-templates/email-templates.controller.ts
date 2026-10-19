import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  CreateEmailTemplateDto,
  SendTestEmailDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';
import { EmailTemplatesService } from './email-templates.service';

@Controller('admin/email-templates')
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @RequirePermissions('email_templates.view')
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('trigger') trigger?: string,
  ) {
    return this.templates.findAll({ search, trigger });
  }

  @RequirePermissions('email_templates.view')
  @Get('triggers')
  getTriggers() {
    return this.templates.getTriggers();
  }

  @RequirePermissions('email_templates.view')
  @Get('merge-tags')
  getMergeTags() {
    return this.templates.getMergeTags();
  }

  @RequirePermissions('email_templates.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @RequirePermissions('email_templates.view')
  @Get(':id/preview')
  preview(@Param('id') id: string) {
    return this.templates.previewTemplate(id);
  }

  @RequirePermissions('email_templates.edit')
  @Post()
  create(@Body() dto: CreateEmailTemplateDto, @CurrentUser() user: AuthUser) {
    return this.templates.create(dto, user.sub);
  }

  @RequirePermissions('email_templates.edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templates.update(id, dto);
  }

  @RequirePermissions('email_templates.edit')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post(':id/send-test')
  sendTest(@Param('id') id: string, @Body() dto: SendTestEmailDto) {
    return this.templates.sendTestEmail(id, dto.to);
  }

  @RequirePermissions('email_templates.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templates.remove(id);
  }
}
