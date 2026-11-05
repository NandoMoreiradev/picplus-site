import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { WhatsappConversationStatus } from '@prisma/client';

export class SendAgentMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  replyToMessageId?: string;
}

export class UpdateConversationStatusDto {
  @IsEnum(WhatsappConversationStatus)
  status!: WhatsappConversationStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  resolutionReason?: string;
}

export class CreateConversationNoteDto {
  @IsString()
  content!: string;
}

export class UpdateChannelConfigDto {
  @IsString()
  phoneNumberId!: string;

  @IsString()
  wabaId!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  accessToken!: string;

  @IsOptional()
  @IsString()
  verifyToken?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListConversationsQueryDto {
  @IsOptional()
  @IsEnum(WhatsappConversationStatus)
  status?: WhatsappConversationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}
