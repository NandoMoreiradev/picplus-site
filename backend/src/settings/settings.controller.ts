import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Resource } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Public()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }
}

@Resource('settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
