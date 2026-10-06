import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ContactsService } from './contacts.service';
import {
  ListContactsQueryDto,
  SubmitContactDto,
  UpdateContactStatusDto,
} from './dto/contact.dto';

@Public()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  /** Contato geral e pedido de orçamento (campo `type`). 5 envios por hora por IP. */
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(201)
  @Post()
  submit(@Body() dto: SubmitContactDto) {
    return this.contacts.submit(dto);
  }
}

@Controller('admin/contacts')
export class AdminContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@Query() query: ListContactsQueryDto) {
    return this.contacts.listAdmin(query);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto) {
    return this.contacts.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contacts.remove(id);
  }
}
