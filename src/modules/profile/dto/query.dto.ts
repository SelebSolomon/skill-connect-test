import { IsOptional, IsString, IsNumber, IsBoolean, IsMongoId, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProfilesDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsMongoId()
  serviceId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRating?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;
}
