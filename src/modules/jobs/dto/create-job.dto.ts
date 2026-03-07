import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
}
