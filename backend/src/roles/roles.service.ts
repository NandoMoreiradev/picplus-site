import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertCanGrant, assertCanManage } from '../access/access.utils';
import { normalizePermissions } from '../access/permissions';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  /** Lista enxuta para os seletores de cargo. */
  options() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado.');
    return role;
  }

  async create(dto: CreateRoleDto, actor: AuthUser) {
    const permissions = normalizePermissions(dto.permissions);
    assertCanGrant(actor, permissions);
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name.trim(),
          description: dto.description,
          permissions,
        },
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(id: string, dto: UpdateRoleDto, actor: AuthUser) {
    const current = await this.findOne(id);
    assertCanManage(actor, current.permissions, 'um cargo');

    const data: Prisma.RoleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.permissions !== undefined) {
      const permissions = normalizePermissions(dto.permissions);
      // Só as permissões ACRESCENTADAS precisam estar com quem edita.
      assertCanGrant(
        actor,
        permissions.filter((key) => !current.permissions.includes(key)),
      );
      data.permissions = permissions;
    }
    try {
      return await this.prisma.role.update({ where: { id }, data });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async remove(id: string, actor: AuthUser) {
    const role = await this.findOne(id);
    assertCanManage(actor, role.permissions, 'um cargo');
    if (role._count.users > 0) {
      throw new ConflictException(
        `Este cargo está atribuído a ${role._count.users} usuário(s). Mude o cargo deles antes de excluir.`,
      );
    }
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Já existe um cargo com este nome.');
    }
    throw error;
  }
}
