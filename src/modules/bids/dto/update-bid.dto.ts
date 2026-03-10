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

export class UpdateBidDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  proposedPrice?: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  estimatedDuration?: number; // e.g. number of days

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  message?: string;
}
