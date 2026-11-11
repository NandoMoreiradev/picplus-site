import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { MailService } from './mail.service';

@Public()
@SkipThrottle()
@Controller('webhooks/resend')
export class ResendWebhookController {
  constructor(private readonly mail: MailService) {}

  @Post()
  @HttpCode(200)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
  ) {
    const rawPayload = req.rawBody
      ? req.rawBody.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});

    if (!rawPayload) {
      throw new BadRequestException('Corpo da requisição vazio.');
    }

    return this.mail.handleResendWebhook(rawPayload, {
      id: svixId,
      timestamp: svixTimestamp,
      signature: svixSignature,
    });
  }
}
