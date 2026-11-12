import {
  CouponDiscountType,
  CourseLevel,
  LessonVideoProvider,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// ─────────────────────────────────────────────────────────────
// Autenticação de Aluno
// ─────────────────────────────────────────────────────────────

export class RegisterStudentDto {
  @IsString()
  @MinLength(2, { message: 'Informe seu nome completo.' })
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class LoginStudentDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password!: string;
}

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class ChangeStudentPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(100)
  newPassword!: string;
}

export class ForgotStudentPasswordDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;
}

export class ResetStudentPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(100)
  newPassword!: string;
}

// ─────────────────────────────────────────────────────────────
// Cursos, Módulos e Aulas (Admin)
// ─────────────────────────────────────────────────────────────

export class CreateCourseDto {
  @IsString()
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres.' })
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  subtitle?: string;

  @IsString()
  @MinLength(10, { message: 'A descrição do curso é obrigatória.' })
  description!: string;

  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  promoVideoUrl?: string | null;

  @IsString()
  @MinLength(2, { message: 'Informe o nome do instrutor.' })
  @MaxLength(120)
  instructorName!: string;

  @IsOptional()
  @IsString()
  instructorBio?: string | null;

  @IsOptional()
  @IsString()
  instructorAvatar?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtPriceCents?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workloadHours?: number;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  promoVideoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instructorName?: string;

  @IsOptional()
  @IsString()
  instructorBio?: string | null;

  @IsOptional()
  @IsString()
  instructorAvatar?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtPriceCents?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workloadHours?: number;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class CreateCourseModuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateCourseModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class ReorderItemsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class CreateCourseLessonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(LessonVideoProvider)
  videoProvider?: LessonVideoProvider;

  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateCourseLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(LessonVideoProvider)
  videoProvider?: LessonVideoProvider;

  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

// ─────────────────────────────────────────────────────────────
// Cupons e Matrículas (Admin)
// ─────────────────────────────────────────────────────────────

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code!: string;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  courseId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  courseId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ManualEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido para o aluno.' })
  studentEmail?: string;

  @IsOptional()
  @IsString()
  studentName?: string;

  @IsOptional()
  @IsString()
  studentPassword?: string;
}

// ─────────────────────────────────────────────────────────────
// Checkout, Progresso e Comentários (Aluno / Público)
// ─────────────────────────────────────────────────────────────

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;
}

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class RegisterAndCheckoutDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsString()
  @MinLength(2, { message: 'Informe seu nome completo.' })
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class LoginAndCheckoutDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password!: string;
}

export class UpdateLessonProgressDto {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86400)
  lastPositionSeconds?: number;
}

export class CreateLessonCommentDto {
  @IsString()
  @MinLength(2, { message: 'Digite seu comentário.' })
  @MaxLength(3000)
  content!: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
