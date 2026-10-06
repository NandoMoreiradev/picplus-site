import { Module } from '@nestjs/common';
import { AdminTeamController, TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  controllers: [TeamController, AdminTeamController],
  providers: [TeamService],
})
export class TeamModule {}
