import { Module } from '@nestjs/common';
import {
  AdminServicesController,
  ServicesController,
} from './services.controller';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController, AdminServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
