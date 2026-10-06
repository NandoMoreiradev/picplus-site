import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PERMISSION_GROUPS } from '../access/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  Resource,
} from '../common/decorators/permissions.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@Controller('admin')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** Catálogo de permissões (alimenta a matriz do editor de cargos). */
  @RequireAnyPermission('roles.view', 'roles.create', 'roles.edit')
  @Get('permissions')
  permissions() {
    return PERMISSION_GROUPS;
  }

  /** Cargos para seletores (cadastro de usuários). */
  @RequireAnyPermission('roles.view', 'users.create', 'users.edit')
  @Get('roles/options')
  options() {
    return this.roles.options();
  }

  @Resource('roles')
  @Get('roles')
  list() {
    return this.roles.list();
  }

  @Resource('roles')
  @Get('roles/:id')
  findOne(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @Resource('roles')
  @Post('roles')
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthUser) {
    return this.roles.create(dto, actor);
  }

  @Resource('roles')
  @Patch('roles/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.roles.update(id, dto, actor);
  }

  @Resource('roles')
  @Delete('roles/:id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.roles.remove(id, actor);
  }
}
