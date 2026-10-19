import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailTriggerType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { config } from '../config/configuration';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ChangeStudentPasswordDto,
  ForgotStudentPasswordDto,
  LoginStudentDto,
  RegisterStudentDto,
  ResetStudentPasswordDto,
  UpdateStudentProfileDto,
} from './dto/academy.dto';

const DUMMY_HASH = bcrypt.hashSync('picplus-academy-dummy-password', 12);

const STUDENT_SELECT = {
  id: true,
  name: true,
  email: true,
  cpf: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class AcademyAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly storage: StorageService,
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  private getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
  }

  private async signToken(student: { id: string; email: string }) {
    return this.jwt.signAsync({
      sub: student.id,
      email: student.email,
      kind: 'student',
    });
  }

  async register(dto: RegisterStudentDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.student.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma conta cadastrada com este e-mail. Faça login para continuar.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const student = await this.prisma.student.create({
      data: {
        name: dto.name.trim(),
        email,
        password: passwordHash,
        cpf: dto.cpf?.trim() || null,
        phone: dto.phone?.trim() || null,
        active: true,
      },
      select: STUDENT_SELECT,
    });

    // Dispara o e-mail de boas-vindas em background (sem travar a requisição)
    void this.emailTemplates.sendByTrigger(
      EmailTriggerType.ACADEMY_WELCOME,
      student.email,
      {
        student: {
          name: student.name,
          first_name: this.getFirstName(student.name),
          email: student.email,
        },
        action_url: `${config.frontendUrl}/academy/minha-area`,
      },
    );

    const accessToken = await this.signToken(student);
    return { accessToken, student };
  }

  async login(dto: LoginStudentDto) {
    const email = dto.email.toLowerCase().trim();
    const student = await this.prisma.student.findUnique({
      where: { email },
      select: { ...STUDENT_SELECT, password: true, active: true },
    });

    const valid = await bcrypt.compare(
      dto.password,
      student?.password ?? DUMMY_HASH,
    );
    if (!student || !valid || !student.active) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const accessToken = await this.signToken(student);
    return {
      accessToken,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        cpf: student.cpf,
        phone: student.phone,
        avatarUrl: student.avatarUrl,
        createdAt: student.createdAt,
      },
    };
  }

  async me(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: STUDENT_SELECT,
    });
    if (!student) {
      throw new UnauthorizedException('Aluno não encontrado.');
    }
    return student;
  }

  async updateProfile(studentId: string, dto: UpdateStudentProfileDto) {
    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.cpf !== undefined ? { cpf: dto.cpf.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      },
      select: STUDENT_SELECT,
    });
  }

  async setAvatar(studentId: string, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const url = await this.storage.saveAvatar(file);
    const previous = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { avatarUrl: true },
    });
    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: { avatarUrl: url },
      select: STUDENT_SELECT,
    });
    if (previous?.avatarUrl && previous.avatarUrl !== url) {
      await this.storage.remove(previous.avatarUrl);
    }
    return updated;
  }

  async changePassword(studentId: string, dto: ChangeStudentPasswordDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new UnauthorizedException('Aluno não encontrado.');

    if (!(await bcrypt.compare(dto.currentPassword, student.password))) {
      throw new BadRequestException('A senha atual está incorreta.');
    }

    await this.prisma.student.update({
      where: { id: studentId },
      data: { password: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { ok: true };
  }

  async requestPasswordReset(dto: ForgotStudentPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const student = await this.prisma.student.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, active: true },
    });

    // Sempre retorna sucesso para não revelar quais e-mails estão cadastrados.
    if (!student || !student.active) {
      return {
        ok: true,
        message:
          'Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.',
      };
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.student.update({
      where: { id: student.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      },
    });

    const resetUrl = `${config.frontendUrl}/academy/redefinir-senha?token=${token}`;
    void this.emailTemplates.sendByTrigger(
      EmailTriggerType.ACADEMY_PASSWORD_RESET,
      student.email,
      {
        student: {
          name: student.name,
          first_name: this.getFirstName(student.name),
          email: student.email,
        },
        action_url: resetUrl,
      },
    );

    return {
      ok: true,
      message:
        'Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.',
    };
  }

  async resetPassword(dto: ResetStudentPasswordDto) {
    const student = await this.prisma.student.findFirst({
      where: {
        resetToken: dto.token.trim(),
        resetTokenExpiresAt: { gt: new Date() },
        active: true,
      },
    });

    if (!student) {
      throw new BadRequestException(
        'Link de recuperação inválido ou expirado. Solicite um novo link.',
      );
    }

    await this.prisma.student.update({
      where: { id: student.id },
      data: {
        password: await bcrypt.hash(dto.newPassword, 12),
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { ok: true, message: 'Senha atualizada com sucesso!' };
  }
}
