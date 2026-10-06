import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InfluencerStatus, Prisma } from '@prisma/client';
import { config } from '../config/configuration';
import { paginated, pageArgs } from '../common/utils/paginate';
import { normalizeSocialLinks } from '../common/utils/social';
import { buildWhatsAppLink } from '../common/utils/whatsapp';
import { MailService } from '../mail/mail.service';
import { templates } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ApproveInfluencerDto,
  ListInfluencersQueryDto,
  ListShowcaseQueryDto,
  RegisterInfluencerDto,
  RejectInfluencerDto,
  UpdateInfluencerDto,
} from './dto/influencer.dto';

export interface RegisterFiles {
  profileImage?: Express.Multer.File[];
  coverImage?: Express.Multer.File[];
  presentationPdf?: Express.Multer.File[];
}

/** Campos expostos publicamente — nunca inclui e-mail, WhatsApp ou dados de moderação. */
const SHOWCASE_SELECT = {
  id: true,
  name: true,
  niche: true,
  location: true,
  description: true,
  profileImage: true,
  coverImage: true,
  presentationPdf: true,
  socialNetworks: true,
} satisfies Prisma.InfluencerSelect;

const showcaseWhere = (): Prisma.InfluencerWhereInput => ({
  status: InfluencerStatus.APPROVED,
  showOnShowcase: true,
});

@Injectable()
export class InfluencersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  // ── Público ────────────────────────────────────────────────

  async register(dto: RegisterInfluencerDto, files: RegisterFiles) {
    // Honeypot preenchido = bot. Responde "sucesso" sem gravar nada.
    if (dto.website) return { ok: true };

    const socialNetworks = normalizeSocialLinks(
      dto as unknown as Record<string, unknown>,
    );
    if (!Object.keys(socialNetworks).length) {
      throw new BadRequestException('Informe ao menos uma rede social.');
    }
    const profile = files.profileImage?.[0];
    if (!profile) throw new BadRequestException('Envie uma foto de perfil.');

    const existing = await this.prisma.influencer.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Já existe um cadastro com este e-mail.');
    }

    const saved: string[] = [];
    try {
      const profileImage = await this.storage.save(profile, 'image');
      saved.push(profileImage);
      const cover = files.coverImage?.[0];
      const coverImage = cover
        ? await this.storage.save(cover, 'image')
        : undefined;
      if (coverImage) saved.push(coverImage);
      const pdf = files.presentationPdf?.[0];
      const presentationPdf = pdf
        ? await this.storage.save(pdf, 'pdf')
        : undefined;
      if (presentationPdf) saved.push(presentationPdf);

      const influencer = await this.prisma.influencer.create({
        data: {
          name: dto.name,
          email: dto.email,
          whatsapp: dto.whatsapp,
          niche: dto.niche,
          location: dto.location,
          description: dto.description,
          socialNetworks,
          profileImage,
          coverImage,
          presentationPdf,
        },
      });

      // Notificações não bloqueiam a resposta; MailService nunca lança.
      void this.mail.send({
        to: influencer.email,
        subject: 'Recebemos o seu cadastro — PicPlus',
        html: templates.influencerReceived(influencer.name),
      });
      void this.mail.send({
        to: this.mail.adminRecipients,
        subject: `Novo influenciador: ${influencer.name}`,
        html: templates.adminNewInfluencer({
          name: influencer.name,
          email: influencer.email,
          niche: influencer.niche,
          adminUrl: `${config.frontendUrl}/admin/influenciadores`,
        }),
      });

      return { ok: true };
    } catch (error) {
      await Promise.all(saved.map((url) => this.storage.remove(url)));
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe um cadastro com este e-mail.');
      }
      throw error;
    }
  }

  async listShowcase(query: ListShowcaseQueryDto) {
    const where: Prisma.InfluencerWhereInput = {
      ...showcaseWhere(),
      ...(query.niche ? { niche: query.niche } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { niche: { contains: query.search, mode: 'insensitive' } },
              { location: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.influencer.findMany({
        where,
        select: SHOWCASE_SELECT,
        orderBy: [{ reviewedAt: 'desc' }, { name: 'asc' }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.influencer.count({ where }),
    ]);
    return paginated(items, total, query.page, query.limit);
  }

  async showcaseNiches() {
    const rows = await this.prisma.influencer.findMany({
      where: { ...showcaseWhere(), niche: { not: null } },
      select: { niche: true },
      distinct: ['niche'],
      orderBy: { niche: 'asc' },
    });
    return rows.map((row) => row.niche as string);
  }

  async findShowcase(id: string) {
    const influencer = await this.prisma.influencer.findFirst({
      where: { id, ...showcaseWhere() },
      select: SHOWCASE_SELECT,
    });
    if (!influencer) throw new NotFoundException('Perfil não encontrado.');
    return influencer;
  }

  // ── Admin ──────────────────────────────────────────────────

  async listAdmin(query: ListInfluencersQueryDto) {
    const where: Prisma.InfluencerWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { niche: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total, pending, approved, rejected] =
      await this.prisma.$transaction([
        this.prisma.influencer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...pageArgs(query.page, query.limit),
        }),
        this.prisma.influencer.count({ where }),
        this.prisma.influencer.count({
          where: { status: InfluencerStatus.PENDING },
        }),
        this.prisma.influencer.count({
          where: { status: InfluencerStatus.APPROVED },
        }),
        this.prisma.influencer.count({
          where: { status: InfluencerStatus.REJECTED },
        }),
      ]);

    // Contagem por status (independente dos filtros) alimenta as abas do painel.
    const counts = { PENDING: pending, APPROVED: approved, REJECTED: rejected };
    return { ...paginated(items, total, query.page, query.limit), counts };
  }

  async findOne(id: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id },
    });
    if (!influencer)
      throw new NotFoundException('Influenciador não encontrado.');
    return influencer;
  }

  async update(id: string, dto: UpdateInfluencerDto) {
    const current = await this.findOne(id);
    const { socialNetworks, ...rest } = dto;
    const data: Prisma.InfluencerUpdateInput = { ...rest };
    if (socialNetworks !== undefined) {
      data.socialNetworks = normalizeSocialLinks(socialNetworks);
    }

    const updated = await this.prisma.influencer.update({
      where: { id },
      data,
    });

    // Apaga do disco arquivos substituídos ou removidos.
    for (const field of [
      'profileImage',
      'coverImage',
      'presentationPdf',
    ] as const) {
      if (dto[field] !== undefined && dto[field] !== current[field]) {
        await this.storage.remove(current[field]);
      }
    }
    return updated;
  }

  async approve(id: string, dto: ApproveInfluencerDto) {
    await this.findOne(id);
    const showOnShowcase = dto.showOnShowcase ?? true;
    const influencer = await this.prisma.influencer.update({
      where: { id },
      data: {
        status: InfluencerStatus.APPROVED,
        showOnShowcase,
        rejectionReason: null,
        reviewedAt: new Date(),
      },
    });

    let emailSent = false;
    if (dto.notify !== false) {
      emailSent = await this.mail.send({
        to: influencer.email,
        subject: 'Seu cadastro foi aprovado — PicPlus',
        html: templates.influencerApproved(
          influencer.name,
          `${config.frontendUrl}/influenciadores`,
          showOnShowcase,
        ),
      });
    }
    return { influencer, emailSent };
  }

  async reject(id: string, dto: RejectInfluencerDto) {
    await this.findOne(id);
    const reason = dto.reason?.trim() || null;
    const channels = dto.channels ?? [];

    const influencer = await this.prisma.influencer.update({
      where: { id },
      data: {
        status: InfluencerStatus.REJECTED,
        showOnShowcase: false,
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
    });

    let emailSent = false;
    if (channels.includes('email')) {
      emailSent = await this.mail.send({
        to: influencer.email,
        subject: 'Atualização sobre o seu cadastro — PicPlus',
        html: templates.influencerRejected(influencer.name, reason),
      });
    }

    // WhatsApp: devolvemos um link wa.me já com o texto; o admin confirma o envio no próprio app.
    let whatsappUrl: string | null = null;
    if (channels.includes('whatsapp')) {
      const message =
        `Olá, ${influencer.name}! Aqui é da equipe PicPlus.\n\n` +
        'Analisamos o seu cadastro e, neste momento, não vamos seguir com ele.' +
        (reason ? `\n\nMotivo: ${reason}` : '') +
        '\n\nAgradecemos o interesse e desejamos muito sucesso!';
      whatsappUrl = buildWhatsAppLink(influencer.whatsapp, message);
    }

    return { influencer, emailSent, whatsappUrl };
  }

  async setShowcase(id: string, show: boolean) {
    const current = await this.findOne(id);
    if (show && current.status !== InfluencerStatus.APPROVED) {
      throw new BadRequestException(
        'Só é possível exibir na vitrine perfis aprovados.',
      );
    }
    return this.prisma.influencer.update({
      where: { id },
      data: { showOnShowcase: show },
    });
  }

  async remove(id: string) {
    const influencer = await this.findOne(id);
    await this.prisma.influencer.delete({ where: { id } });
    await Promise.all(
      [
        influencer.profileImage,
        influencer.coverImage,
        influencer.presentationPdf,
      ].map((url) => this.storage.remove(url)),
    );
    return { ok: true };
  }
}
