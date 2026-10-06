import { Module } from '@nestjs/common';
import {
  AdminArticlesController,
  ArticlesController,
} from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  controllers: [ArticlesController, AdminArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
