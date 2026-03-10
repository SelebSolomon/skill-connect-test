import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBidDto {
  @IsMongoId()
  @IsNotEmpty()
  jobId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  proposedPrice: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  estimatedDuration: number; // e.g. number of days

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
