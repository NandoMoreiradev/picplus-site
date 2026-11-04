import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  Resource,
} from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AsaasWebhookPayload } from './clients.service';
import { ClientsService } from './clients.service';
import {
  ConvertContactToClientDto,
  CreateClientChargeDto,
  CreateClientContactDto,
  CreateClientDto,
  CreateClientNoteDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from './dto/client.dto';

@Resource('clients')
@Controller('admin/clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(@Query() query: ListClientsQueryDto) {
    return this.clients.list(query);
  }

  @Get('stats')
  getStats() {
    return this.clients.getStats();
  }

  @Get('lookup/cnpj/:cnpj')
  lookupCnpj(@Param('cnpj') cnpj: string) {
    return this.clients.lookupCnpj(cnpj);
  }

  @Get('lookup/cep/:cep')
  lookupCep(@Param('cep') cep: string) {
    return this.clients.lookupCep(cep);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.clients.getById(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clients.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.clients.delete(id);
  }

  @Post(':id/contacts')
  addContact(@Param('id') id: string, @Body() dto: CreateClientContactDto) {
    return this.clients.addContact(id, dto);
  }

  @Delete(':id/contacts/:contactId')
  deleteContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.clients.deleteContact(id, contactId);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateClientNoteDto,
  ) {
    return this.clients.addNote(id, user.sub, dto);
  }

  @RequirePermissions('clients.financial')
  @Post(':id/charges')
  createCharge(@Param('id') id: string, @Body() dto: CreateClientChargeDto) {
    return this.clients.createCharge(id, dto);
  }

  @RequirePermissions('clients.create')
  @Post('convert-from-contact/:contactRequestId')
  convertFromContact(
    @Param('contactRequestId') contactRequestId: string,
    @Body() dto: ConvertContactToClientDto,
  ) {
    return this.clients.convertFromContactRequest(contactRequestId, dto);
  }
}

@Public()
@Controller('webhooks/asaas')
export class AsaasWebhookController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @HttpCode(200)
  handleWebhook(
    @Body() payload: AsaasWebhookPayload,
    @Headers('asaas-access-token') webhookToken?: string,
  ) {
    return this.clients.processAsaasWebhook(payload, webhookToken);
  }
}
