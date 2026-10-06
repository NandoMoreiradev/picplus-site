import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../access/permissions';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsArray()
  @ArrayMaxSize(ALL_PERMISSIONS.length)
  @IsIn(ALL_PERMISSIONS, {
    each: true,
    message: 'Permissão desconhecida: $value.',
  })
  permissions: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
