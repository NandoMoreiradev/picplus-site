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
  RequireAnyPermission,
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
  UpdateAccountDto,
  UpdateCategoryDto,
  UpdateCostCenterDto,
  UpdateFinancialEntryDto,
  UpdateSupplierDto,
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
    return this.finance.getDre(
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
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
  updateEntry(@Param('id') id: string, @Body() dto: UpdateFinancialEntryDto) {
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

  @Put('categories/:id')
  @RequirePermissions('financial.settings')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.finance.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  @RequirePermissions('financial.settings')
  async deleteCategory(@Param('id') id: string) {
    await this.finance.deleteCategory(id);
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

  @Put('cost-centers/:id')
  @RequirePermissions('financial.settings')
  updateCostCenter(
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
  ) {
    return this.finance.updateCostCenter(id, dto);
  }

  @Delete('cost-centers/:id')
  @HttpCode(204)
  @RequirePermissions('financial.settings')
  async deleteCostCenter(@Param('id') id: string) {
    await this.finance.deleteCostCenter(id);
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

  @Put('accounts/:id')
  @RequirePermissions('financial.settings')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.finance.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @HttpCode(204)
  @RequirePermissions('financial.settings')
  async deleteAccount(@Param('id') id: string) {
    await this.finance.deleteAccount(id);
  }

  @Get('suppliers')
  @RequirePermissions('financial.view')
  listSuppliers() {
    return this.finance.listSuppliers();
  }

  @Post('suppliers')
  @RequireAnyPermission('financial.settings', 'financial.payables')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.finance.createSupplier(dto);
  }

  @Put('suppliers/:id')
  @RequireAnyPermission('financial.settings', 'financial.payables')
  updateSupplier(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.finance.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @HttpCode(204)
  @RequireAnyPermission('financial.settings', 'financial.payables')
  async deleteSupplier(@Param('id') id: string) {
    await this.finance.deleteSupplier(id);
  }
}
