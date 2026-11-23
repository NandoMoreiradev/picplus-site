import {
  Body,
  Controller,
  HttpCode,
  Options,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CaptureLandingLeadDto } from './dto/landing-page.dto';
import { LandingPagesService } from './landing-pages.service';

@Public()
@Controller('public/landing-pages')
export class LandingPagesPublicController {
  constructor(private readonly service: LandingPagesService) {}

  @Options(':slug/leads')
  @HttpCode(204)
  preflight(@Res() res: Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send();
  }

  @Post(':slug/leads')
  @HttpCode(201)
  async captureLead(
    @Param('slug') slug: string,
    @Body() dto: CaptureLandingLeadDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Permite que páginas exportadas e hospedadas em domínios externos enviem leads para o PicPlus.
    res.setHeader('Access-Control-Allow-Origin', '*');
    return this.service.captureLead(slug, dto);
  }
}
