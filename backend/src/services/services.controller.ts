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
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { ServicesService } from './services.service';

@Public()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list() {
    return this.services.listPublic();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.services.findBySlug(slug);
  }
}

@Resource('services')
@Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list() {
    return this.services.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.services.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.services.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.services.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.services.remove(id);
  }
}
