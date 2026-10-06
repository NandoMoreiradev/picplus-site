import { Module } from '@nestjs/common';
import {
  AdminInfluencersController,
  InfluencersController,
} from './influencers.controller';
import { InfluencersService } from './influencers.service';

@Module({
  controllers: [InfluencersController, AdminInfluencersController],
  providers: [InfluencersService],
})
export class InfluencersModule {}
