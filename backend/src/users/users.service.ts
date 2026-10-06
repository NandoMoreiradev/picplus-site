import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { assertCanGrant, assertCanManage } from '../access/access.utils';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

/** Campos devolvidos pela API (nunca inclui a senha). */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isOwner: true,
  active: true,
  createdAt: true,
  role: { select: { id: true, name: true, permissions: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

const present = ({ role, ...user }: UserRow) => ({
  ...user,
  role: role ? { id: role.id, name: role.name } : null,
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: [{ isOwner: 'desc' }, { name: 'asc' }],
    });
    return users.map(present);
  }

  async findOne(id: string) {
    return present(await this.findRow(id));
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    if (dto.isOwner && !actor.isOwner) {
      throw new ForbiddenException(
        'Somente proprietários criam proprietários.',
      );
    }
    if (!dto.isOwner && !dto.roleId) {
      throw new BadRequestException('Selecione um cargo para o usuário.');
    }
    const role = dto.roleId ? await this.findRole(dto.roleId) : null;
    if (role) assertCanGrant(actor, role.permissions);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email,
          password: await bcrypt.hash(dto.password, 12),
          isOwner: dto.isOwner ?? false,
          active: dto.active ?? true,
          roleId: role?.id ?? null,
        },
        select: USER_SELECT,
      });
      return present(user);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const target = await this.findRow(id);
    this.assertCanManageUser(actor, target);

    if (
      dto.isOwner !== undefined &&
      dto.isOwner !== target.isOwner &&
      !actor.isOwner
    ) {
      throw new ForbiddenException(
        'Somente proprietários alteram esse status.',
      );
    }
    if (id === actor.sub && dto.active === false) {
      throw new BadRequestException(
        'Você não pode desativar o próprio usuário.',
      );
    }
    // Um proprietário só deixa de ser proprietário/ativo se houver outro ativo.
    const losesOwnership =
      target.isOwner && (dto.isOwner === false || dto.active === false);
    if (losesOwnership) await this.assertAnotherOwner(id);

    const data: Prisma.UserUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.isOwner !== undefined) data.isOwner = dto.isOwner;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);
    if (dto.roleId !== undefined) {
      if (dto.roleId === null) {
        data.roleId = null;
      } else {
        const role = await this.findRole(dto.roleId);
        assertCanGrant(actor, role.permissions);
        data.roleId = role.id;
      }
    }

    try {
      return present(
        await this.prisma.user.update({
          where: { id },
          data,
          select: USER_SELECT,
        }),
      );
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async remove(id: string, actor: AuthUser) {
    const target = await this.findRow(id);
    this.assertCanManageUser(actor, target);
    if (id === actor.sub) {
      throw new BadRequestException('Você não pode excluir o próprio usuário.');
    }
    if (target.isOwner) await this.assertAnotherOwner(id);

    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  // ── Regras auxiliares ───────────────────────────────────

  /** Proprietários só são geridos por proprietários; os demais, por quem tem permissões equivalentes ou maiores. */
  private assertCanManageUser(actor: AuthUser, target: UserRow) {
    if (actor.isOwner) return;
    if (target.isOwner) {
      throw new ForbiddenException(
        'Somente proprietários gerenciam outros proprietários.',
      );
    }
    assertCanManage(actor, target.role?.permissions ?? [], 'um usuário');
  }

  private async assertAnotherOwner(excludingId: string) {
    const others = await this.prisma.user.count({
      where: { isOwner: true, active: true, id: { not: excludingId } },
    });
    if (others === 0) {
      throw new ConflictException(
        'É preciso manter ao menos um proprietário ativo.',
      );
    }
  }

  private async findRow(id: string): Promise<UserRow> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  private async findRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BadRequestException('Cargo não encontrado.');
    return role;
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    throw error;
  }
}
