import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskPriority } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** "a,b" ou ["a","b"] → ["a","b"] (parâmetros de query). */
const toList = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value) return value.split(',');
  return undefined;
};

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class CreateTaskDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Informe o título da tarefa.' })
  @MaxLength(200)
  title: string;

  /** HTML do editor de texto. */
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  /** Obrigatório, exceto em subtarefas (herdam o projeto da tarefa-pai). */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Estágio (coluna). Se omitido, usa o primeiro do projeto. */
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  coAssigneeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  tags?: string[];

  /** Cria um item de checklist da tarefa informada. */
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  estimatedMinutes?: number | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  /** Marca como concluída/reaberta (move para um estágio concluído/em aberto quando existir). */
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class FilterTasksDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority[];

  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsUUID('all', { each: true })
  tags?: string[];

  /** Só as minhas: atribuídas a mim ou em que sou colaborador(a). */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  mine?: boolean;
}

class OrderItemDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  order: number;
}

export class ReorderDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  /** Restringe a reordenação a uma coluna (evita mexer em tarefas de outro estágio). */
  @IsOptional()
  @IsUUID()
  stageId?: string;
}

export class BulkIdsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids: string[];
}

/** Campos que as ações em massa podem alterar. */
export class BulkUpdateDto extends BulkIdsDto {
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class CreateCommentDto {
  /** HTML do editor de texto. */
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}

export class UpdateCommentDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content: string;
}
