import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason, ReportTargetType } from '../schema/report.schema';

export class CreateReportDto {
  /** Whether you are reporting a user or a job listing */
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  /** The MongoDB ID of the user or job being reported */
  @IsMongoId()
  targetId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
