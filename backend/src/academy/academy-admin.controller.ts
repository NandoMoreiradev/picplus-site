import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnrollmentStatus } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AcademyAdminService } from './academy-admin.service';
import {
  CreateCouponDto,
  CreateCourseDto,
  CreateCourseLessonDto,
  CreateCourseModuleDto,
  CreateLessonCommentDto,
  ManualEnrollmentDto,
  ReorderItemsDto,
  UpdateCouponDto,
  UpdateCourseDto,
  UpdateCourseLessonDto,
  UpdateCourseModuleDto,
} from './dto/academy.dto';

@Controller('admin/academy')
export class AcademyAdminController {
  constructor(private readonly admin: AcademyAdminService) {}

  @RequirePermissions('academy.view')
  @Get('overview')
  getOverview() {
    return this.admin.getOverview();
  }

  // ─── Cursos ────────────────────────────────────────────────
  @RequirePermissions('academy.view')
  @Get('courses')
  listCourses() {
    return this.admin.listCourses();
  }

  @RequirePermissions('academy.view')
  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.admin.getCourse(id);
  }

  @RequirePermissions('academy.edit')
  @Post('courses')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.admin.createCourse(dto);
  }

  @RequirePermissions('academy.edit')
  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.admin.updateCourse(id, dto);
  }

  @RequirePermissions('academy.manage')
  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.admin.deleteCourse(id);
  }

  // ─── Módulos e Aulas ───────────────────────────────────────
  @RequirePermissions('academy.edit')
  @Post('courses/:courseId/modules')
  createModule(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseModuleDto,
  ) {
    return this.admin.createModule(courseId, dto);
  }

  @RequirePermissions('academy.edit')
  @Patch('modules/:moduleId')
  updateModule(
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateCourseModuleDto,
  ) {
    return this.admin.updateModule(moduleId, dto);
  }

  @RequirePermissions('academy.edit')
  @Delete('modules/:moduleId')
  deleteModule(@Param('moduleId') moduleId: string) {
    return this.admin.deleteModule(moduleId);
  }

  @RequirePermissions('academy.edit')
  @Patch('courses/:courseId/modules/reorder')
  reorderModules(
    @Param('courseId') courseId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.admin.reorderModules(courseId, dto.ids);
  }

  @RequirePermissions('academy.edit')
  @Post('modules/:moduleId/lessons')
  createLesson(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateCourseLessonDto,
  ) {
    return this.admin.createLesson(moduleId, dto);
  }

  @RequirePermissions('academy.edit')
  @Patch('lessons/:lessonId')
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateCourseLessonDto,
  ) {
    return this.admin.updateLesson(lessonId, dto);
  }

  @RequirePermissions('academy.edit')
  @Delete('lessons/:lessonId')
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.admin.deleteLesson(lessonId);
  }

  @RequirePermissions('academy.edit')
  @Patch('modules/:moduleId/lessons/reorder')
  reorderLessons(
    @Param('moduleId') moduleId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.admin.reorderLessons(moduleId, dto.ids);
  }

  // ─── Uploads de Materiais e Mídia ──────────────────────────
  @RequirePermissions('academy.edit')
  @Post('lessons/:lessonId/materials')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  addLessonMaterial(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title?: string,
  ) {
    return this.admin.addLessonMaterial(lessonId, file, title);
  }

  @RequirePermissions('academy.edit')
  @Delete('materials/:materialId')
  deleteLessonMaterial(@Param('materialId') materialId: string) {
    return this.admin.deleteLessonMaterial(materialId);
  }

  @RequirePermissions('academy.edit')
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  uploadMedia(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.admin.uploadAcademyMedia(file);
  }

  // ─── Cupons de Desconto ────────────────────────────────────
  @RequirePermissions('academy.view')
  @Get('coupons')
  listCoupons() {
    return this.admin.listCoupons();
  }

  @RequirePermissions('academy.manage')
  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.admin.createCoupon(dto);
  }

  @RequirePermissions('academy.manage')
  @Patch('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.admin.updateCoupon(id, dto);
  }

  @RequirePermissions('academy.manage')
  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.admin.deleteCoupon(id);
  }

  // ─── Alunos, Matrículas e Pedidos ──────────────────────────
  @RequirePermissions('academy.view')
  @Get('students')
  listStudents() {
    return this.admin.listStudents();
  }

  @RequirePermissions('academy.manage')
  @Post('enrollments/grant')
  grantManualEnrollment(
    @Body() dto: ManualEnrollmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.grantManualEnrollment(dto, user.sub);
  }

  @RequirePermissions('academy.manage')
  @Patch('enrollments/:id/status')
  updateEnrollmentStatus(
    @Param('id') id: string,
    @Body('status') status: EnrollmentStatus,
  ) {
    return this.admin.updateEnrollmentStatus(id, status);
  }

  @RequirePermissions('academy.view')
  @Get('orders')
  listOrders() {
    return this.admin.listOrders();
  }

  // ─── Comentários / Dúvidas nas Aulas ───────────────────────
  @RequirePermissions('academy.view')
  @Get('comments')
  listComments() {
    return this.admin.listComments();
  }

  @RequirePermissions('academy.edit')
  @Post('comments/:id/reply')
  replyComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLessonCommentDto,
  ) {
    return this.admin.replyComment(id, user.sub, dto);
  }

  @RequirePermissions('academy.edit')
  @Delete('comments/:id')
  deleteComment(@Param('id') id: string) {
    return this.admin.deleteComment(id);
  }
}
