import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export enum NotificationType {
  Message = 'message',
  Job = 'job',
  Bid = 'bid',
  Review = 'review',
  System = 'system',
}

export class CreateNotificationDto {
  @IsMongoId()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsString()
  link?: string;
}
