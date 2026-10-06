import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @Transform(lower)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(128)
  password: string;

  /** Obrigatório para quem não é proprietário. */
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isOwner?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['roleId'] as const),
) {
  /** null remove o cargo. A senha, quando enviada, redefine a atual. */
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  roleId?: string | null;
}
