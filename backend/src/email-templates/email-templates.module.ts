import { Global, Module } from '@nestjs/common';
import { EmailRendererService } from './email-renderer.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';

@Global()
@Module({
  controllers: [EmailTemplatesController],
  providers: [EmailRendererService, EmailTemplatesService],
  exports: [EmailRendererService, EmailTemplatesService],
})
export class EmailTemplatesModule {}
