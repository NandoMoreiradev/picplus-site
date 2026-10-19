import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentStudent } from '../common/decorators/current-user.decorator';
import type { AuthStudent } from '../common/decorators/current-user.decorator';
import { StudentAuthenticated } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AcademyAuthService } from './academy-auth.service';
import { AcademyStudentService } from './academy-student.service';
import {
  ChangeStudentPasswordDto,
  CreateCheckoutDto,
  CreateLessonCommentDto,
  ForgotStudentPasswordDto,
  LoginStudentDto,
  RegisterStudentDto,
  ResetStudentPasswordDto,
  UpdateLessonProgressDto,
  UpdateStudentProfileDto,
  ValidateCouponDto,
} from './dto/academy.dto';

@Controller('academy')
export class AcademyPublicController {
  constructor(
    private readonly auth: AcademyAuthService,
    private readonly studentService: AcademyStudentService,
  ) {}

  // ─── Autenticação do Aluno ─────────────────────────────────
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('auth/register')
  register(@Body() dto: RegisterStudentDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/login')
  login(@Body() dto: LoginStudentDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/forgot-password')
  forgotPassword(@Body() dto: ForgotStudentPasswordDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/reset-password')
  resetPassword(@Body() dto: ResetStudentPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @StudentAuthenticated()
  @Get('auth/me')
  me(@CurrentStudent() student: AuthStudent) {
    return this.auth.me(student.sub);
  }

  @StudentAuthenticated()
  @Patch('auth/me')
  updateProfile(
    @CurrentStudent() student: AuthStudent,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.auth.updateProfile(student.sub, dto);
  }

  @StudentAuthenticated()
  @Post('auth/me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  setAvatar(
    @CurrentStudent() student: AuthStudent,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.auth.setAvatar(student.sub, file);
  }

  @StudentAuthenticated()
  @Patch('auth/password')
  changePassword(
    @CurrentStudent() student: AuthStudent,
    @Body() dto: ChangeStudentPasswordDto,
  ) {
    return this.auth.changePassword(student.sub, dto);
  }

  // ─── Vitrine Pública de Cursos e Certificados ──────────────
  @Public()
  @Get('courses')
  listCourses() {
    return this.studentService.listPublishedCourses();
  }

  @Public()
  @Get('courses/:slug')
  getCourse(@Param('slug') slug: string) {
    return this.studentService.getPublicCourseBySlug(slug);
  }

  @Public()
  @Get('certificates/:code')
  getCertificate(@Param('code') code: string) {
    return this.studentService.getCertificateByCode(code);
  }

  // ─── Cupons, Checkout Mercado Pago e Webhook ───────────────
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('coupons/validate')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.studentService.validateCoupon(dto);
  }

  @StudentAuthenticated()
  @Post('checkout')
  createCheckout(
    @CurrentStudent() student: AuthStudent,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.studentService.createCheckout(student.sub, dto);
  }

  @StudentAuthenticated()
  @Get('orders/:orderId/verify')
  verifyOrder(
    @CurrentStudent() student: AuthStudent,
    @Param('orderId') orderId: string,
    @Query('payment_id') paymentId?: string,
    @Query('simulated') simulated?: string,
    @Query('status') status?: string,
  ) {
    return this.studentService.verifyAndSyncOrder(student.sub, orderId, {
      paymentId,
      simulated,
      status,
    });
  }

  @Public()
  @HttpCode(200)
  @Post('webhooks/mercadopago')
  handleWebhook(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string | undefined>,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.studentService.handleMercadoPagoWebhook({
      body,
      query,
      headers,
    });
  }

  // ─── Área do Aluno (Meus Cursos, Sala de Aula, Comentários) ─
  @StudentAuthenticated()
  @Get('my-courses')
  listMyCourses(@CurrentStudent() student: AuthStudent) {
    return this.studentService.listMyCourses(student.sub);
  }

  @StudentAuthenticated()
  @Get('my-orders')
  listMyOrders(@CurrentStudent() student: AuthStudent) {
    return this.studentService.listMyOrders(student.sub);
  }

  @StudentAuthenticated()
  @Get('classroom/:slug')
  getClassroom(
    @CurrentStudent() student: AuthStudent,
    @Param('slug') slug: string,
  ) {
    return this.studentService.getClassroomCourse(student.sub, slug);
  }

  @StudentAuthenticated()
  @Patch('lessons/:lessonId/progress')
  updateProgress(
    @CurrentStudent() student: AuthStudent,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    return this.studentService.updateLessonProgress(student.sub, lessonId, dto);
  }

  @StudentAuthenticated()
  @Get('lessons/:lessonId/comments')
  listLessonComments(
    @CurrentStudent() student: AuthStudent,
    @Param('lessonId') lessonId: string,
  ) {
    return this.studentService.listLessonComments(student.sub, lessonId);
  }

  @StudentAuthenticated()
  @Post('lessons/:lessonId/comments')
  createLessonComment(
    @CurrentStudent() student: AuthStudent,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateLessonCommentDto,
  ) {
    return this.studentService.createLessonComment(student.sub, lessonId, dto);
  }

  @StudentAuthenticated()
  @Delete('comments/:commentId')
  deleteOwnComment(
    @CurrentStudent() student: AuthStudent,
    @Param('commentId') commentId: string,
  ) {
    return this.studentService.deleteOwnComment(student.sub, commentId);
  }
}
