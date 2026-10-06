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
import { CasesService } from './cases.service';
import { CreateCaseDto, UpdateCaseDto } from './dto/case.dto';

@Public()
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list() {
    return this.cases.listPublic();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.cases.findPublicBySlug(slug);
  }
}

@Resource('cases')
@Controller('admin/cases')
export class AdminCasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list() {
    return this.cases.listAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cases.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCaseDto) {
    return this.cases.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCaseDto) {
    return this.cases.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cases.remove(id);
  }
}
