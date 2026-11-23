import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  Resource,
} from '../common/decorators/permissions.decorator';
import { config } from '../config/configuration';
import {
  GenerateLandingPageDto,
  IterateLandingPageDto,
  UpdateLandingPageDto,
} from './dto/landing-page.dto';
import { LandingPagesService } from './landing-pages.service';

@Resource('ai_studio')
@Controller('admin/ai-studio/landing-pages')
export class LandingPagesController {
  constructor(private readonly service: LandingPagesService) {}

  @Get()
  @RequirePermissions('ai_studio.view')
  list(
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.list({ clientId, projectId });
  }

  @Get(':id')
  @RequirePermissions('ai_studio.view')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post('generate')
  @RequirePermissions('ai_studio.manage')
  generate(@Body() dto: GenerateLandingPageDto, @CurrentUser() user: AuthUser) {
    return this.service.generate(dto, user.sub);
  }

  @Post(':id/iterate')
  @RequirePermissions('ai_studio.manage')
  iterate(
    @Param('id') id: string,
    @Body() dto: IterateLandingPageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.iterate(id, dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('ai_studio.manage')
  update(@Param('id') id: string, @Body() dto: UpdateLandingPageDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/verify-domain')
  @RequirePermissions('ai_studio.manage')
  verifyDomain(@Param('id') id: string) {
    return this.service.verifyCustomDomain(id);
  }

  @Get(':id/export')
  @RequirePermissions('ai_studio.view')
  async exportZip(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const lp = await this.service.getOne(id);
    const origin =
      config.backendUrl ||
      `${req.protocol}://${req.get('host') ?? 'localhost:3000'}`;
    const zipBuffer = this.service.exportZip(lp, origin);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="landing-${lp.slug}.zip"`,
    );
    res.send(zipBuffer);
  }

  @Delete(':id')
  @RequirePermissions('ai_studio.manage')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
