import { Module } from '@nestjs/common';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskCommentsService } from './task-comments.service';
import { TaskProjectsService } from './task-projects.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskProjectsService,
    TaskCommentsService,
    TaskAttachmentsService,
  ],
})
export class TasksModule {}
