import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfluencersModule } from './influencers/influencers.module';
import { PrismaModule } from './prisma/prisma.module';
import { ArticlesModule } from './articles/articles.module';
import { CasesModule } from './cases/cases.module';
import { ServicesModule } from './services/services.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [InfluencersModule, PrismaModule, ArticlesModule, CasesModule, ServicesModule, ContactsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
