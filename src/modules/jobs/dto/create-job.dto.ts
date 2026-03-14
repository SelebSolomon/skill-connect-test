import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  budget: number;

  @IsString()
  @IsNotEmpty()
  jobLocation: string;

  /** JSON-encoded array of milestones sent as FormData string */
  @IsOptional()
  @IsString()
  milestones?: string;
}
