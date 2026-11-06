import {
  Body,
  Controller,
  Delete,
  Get,
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
import {
  CreateAccountDto,
  CreateCategoryDto,
  CreateCostCenterDto,
  CreateFinancialEntryDto,
  CreateSupplierDto,
  ListFinancialEntriesQueryDto,
  SettleFinancialEntryDto,
  UpdateFinancialEntryDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@Resource('financial')
@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('stats')
  @RequirePermissions('financial.view')
  getStats() {
    return this.finance.getStats();
  }

  @Get('dre')
  @RequirePermissions('financial.reports')
  getDre(@Query('year') year?: string) {
    return this.finance.getDre(year ? parseInt(year, 10) : new Date().getFullYear());
  }

  @Get('cash-flow')
  @RequirePermissions('financial.reports')
  getCashFlow(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.finance.getCashFlow(startDate, endDate);
  }

  @Post('sync-charges')
  @RequirePermissions('financial.receivables')
  syncCharges() {
    return this.finance.syncClientCharges();
  }

  // ── Lançamentos ───────────────────────────────────────────────

  @Get('entries')
  @RequirePermissions('financial.view')
  listEntries(@Query() query: ListFinancialEntriesQueryDto) {
    return this.finance.listEntries(query);
  }

  @Get('entries/:id')
  @RequirePermissions('financial.view')
  getEntryById(@Param('id') id: string) {
    return this.finance.getEntryById(id);
  }

  @Post('entries')
  @RequirePermissions('financial.view')
  createEntry(
    @Body() dto: CreateFinancialEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.finance.createEntry(dto, user?.sub);
  }

  @Put('entries/:id')
  @RequirePermissions('financial.view')
  updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.finance.updateEntry(id, dto);
  }

  @Post('entries/:id/settle')
  @RequirePermissions('financial.view')
  settleEntry(
    @Param('id') id: string,
    @Body() dto: SettleFinancialEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.finance.settleEntry(id, dto, user?.sub);
  }

  @Delete('entries/:id')
  @HttpCode(204)
  @RequirePermissions('financial.view')
  async deleteEntry(@Param('id') id: string) {
    await this.finance.deleteEntry(id);
  }

  // ── Categorias & Configurações ────────────────────────────────

  @Get('categories')
  @RequirePermissions('financial.view')
  listCategories() {
    return this.finance.listCategories();
  }

  @Post('categories')
  @RequirePermissions('financial.settings')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.finance.createCategory(dto);
  }

  @Get('cost-centers')
  @RequirePermissions('financial.view')
  listCostCenters() {
    return this.finance.listCostCenters();
  }

  @Post('cost-centers')
  @RequirePermissions('financial.settings')
  createCostCenter(@Body() dto: CreateCostCenterDto) {
    return this.finance.createCostCenter(dto);
  }

  @Get('accounts')
  @RequirePermissions('financial.view')
  listAccounts() {
    return this.finance.listAccounts();
  }

  @Post('accounts')
  @RequirePermissions('financial.settings')
  createAccount(@Body() dto: CreateAccountDto) {
    return this.finance.createAccount(dto);
  }

  @Get('suppliers')
  @RequirePermissions('financial.view')
  listSuppliers() {
    return this.finance.listSuppliers();
  }

  @Post('suppliers')
  @RequirePermissions('financial.payables')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.finance.createSupplier(dto);
  }
}
