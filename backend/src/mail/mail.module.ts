import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ResendWebhookController } from './resend-webhook.controller';

@Global()
@Module({
  controllers: [ResendWebhookController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
