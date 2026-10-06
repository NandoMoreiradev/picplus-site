import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { CasesModule } from './cases/cases.module';
import { ContactsModule } from './contacts/contacts.module';
import { InfluencersModule } from './influencers/influencers.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { StatsModule } from './stats/stats.module';
import { StorageModule } from './storage/storage.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    // Limite global generoso; rotas sensíveis (login, formulários) definem limites próprios.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    MailModule,
    AuthModule,
    InfluencersModule,
    ArticlesModule,
    CasesModule,
    ServicesModule,
    BrandsModule,
    TeamModule,
    ContactsModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
