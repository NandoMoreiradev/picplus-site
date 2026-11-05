import { Module } from '@nestjs/common';
import { AiChatbotModule } from '../ai-chatbot/ai-chatbot.module';
import { TaskAiService } from './task-ai.service';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskCommentsService } from './task-comments.service';
import { TaskProjectsService } from './task-projects.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AiChatbotModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskProjectsService,
    TaskCommentsService,
    TaskAttachmentsService,
    TaskAiService,
  ],
})
export class TasksModule {}
