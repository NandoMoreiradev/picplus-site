import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto/team.dto';

const ORDER = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listPublic() {
    return this.prisma.teamMember.findMany({
      where: { active: true },
      orderBy: ORDER,
    });
  }

  listAll() {
    return this.prisma.teamMember.findMany({ orderBy: ORDER });
  }

  async findOne(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Integrante não encontrado.');
    return member;
  }

  create(dto: CreateTeamMemberDto) {
    return this.prisma.teamMember.create({ data: dto });
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    const current = await this.findOne(id);
    const updated = await this.prisma.teamMember.update({
      where: { id },
      data: dto,
    });
    if (dto.photo !== undefined && dto.photo !== current.photo) {
      await this.storage.remove(current.photo);
    }
    return updated;
  }

  async remove(id: string) {
    const member = await this.findOne(id);
    await this.prisma.teamMember.delete({ where: { id } });
    await this.storage.remove(member.photo);
    return { ok: true };
  }
}
