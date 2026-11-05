import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAiChatbotConfigDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  personaName?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  geminiModel?: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  autoHandoff?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  autoHandoffKeywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxMessagesBeforeHandoff?: number;

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;
}

export class TestAiChatbotPromptDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  geminiModel?: string;
}
