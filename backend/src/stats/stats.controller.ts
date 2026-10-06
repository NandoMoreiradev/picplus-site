import { Controller, Get } from '@nestjs/common';
import { InfluencerStatus } from '@prisma/client';
import { Authenticated } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Números reais exibidos na home (a página oculta o que estiver zerado). */
  @Public()
  @Get('stats')
  async publicStats() {
    const [influencers, cases, brands] = await this.prisma.$transaction([
      this.prisma.influencer.count({
        where: { status: InfluencerStatus.APPROVED, showOnShowcase: true },
      }),
      this.prisma.successCase.count({ where: { published: true } }),
      this.prisma.brand.count({ where: { active: true } }),
    ]);
    return { influencers, cases, brands };
  }

  /** Resumo do painel administrativo. */
  @Authenticated()
  @Get('admin/stats')
  async adminStats() {
    const [
      pendingInfluencers,
      onShowcase,
      newContacts,
      newBudgets,
      draftArticles,
      publishedArticles,
      cases,
      services,
    ] = await this.prisma.$transaction([
      this.prisma.influencer.count({
        where: { status: InfluencerStatus.PENDING },
      }),
      this.prisma.influencer.count({
        where: { status: InfluencerStatus.APPROVED, showOnShowcase: true },
      }),
      this.prisma.contactRequest.count({
        where: { status: 'NEW', type: 'GENERAL' },
      }),
      this.prisma.contactRequest.count({
        where: { status: 'NEW', type: 'BUDGET' },
      }),
      this.prisma.article.count({ where: { published: false } }),
      this.prisma.article.count({ where: { published: true } }),
      this.prisma.successCase.count(),
      this.prisma.service.count(),
    ]);
    return {
      pendingInfluencers,
      onShowcase,
      newContacts,
      newBudgets,
      draftArticles,
      publishedArticles,
      cases,
      services,
    };
  }
}
