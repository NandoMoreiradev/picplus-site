import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Resource } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto/team.dto';
import { TeamService } from './team.service';

@Public()
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list() {
    return this.team.listPublic();
  }
}

@Resource('team')
@Controller('admin/team')
export class AdminTeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list() {
    return this.team.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.team.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTeamMemberDto) {
    return this.team.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeamMemberDto) {
    return this.team.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.team.remove(id);
  }
}
