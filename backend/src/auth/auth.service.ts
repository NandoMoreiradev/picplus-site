import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS } from '../access/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto } from './dto/login.dto';

// Hash fictício usado para igualar o tempo de resposta quando o e-mail não existe.
const DUMMY_HASH = bcrypt.hashSync('picplus-dummy-password', 12);

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  isOwner: true,
  role: { select: { id: true, name: true, permissions: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { ...PROFILE_SELECT, password: true, active: true },
    });

    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    // Mesma mensagem para e-mail inexistente, senha incorreta e usuário desativado.
    if (!user || !valid || !user.active) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, user: this.toProfile(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    return this.toProfile(user);
  }

  /** Perfil enviado ao painel: o cargo e as permissões efetivas decidem o que a interface mostra. */
  private toProfile(user: {
    id: string;
    name: string;
    email: string;
    isOwner: boolean;
    role: { id: string; name: string; permissions: string[] } | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isOwner: user.isOwner,
      role: user.role ? { id: user.role.id, name: user.role.name } : null,
      permissions: user.isOwner
        ? ALL_PERMISSIONS
        : (user.role?.permissions ?? []),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');

    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('A senha atual está incorreta.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { ok: true };
  }
}
