import { IsEnum, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export class AttachmentDto {
  @IsUrl()
  url: string;

  @IsEnum(AttachmentType)
  type: AttachmentType;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
