// update-profile.dto.ts
import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LocationDto } from './location.dto';
import { PortfolioItemDto } from './portfolio.dto';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => value?.trim())
  bio?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? Array.from(new Set(value.map((s) => s.toLowerCase().trim())))
      : [],
  )
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? Array.from(new Set(value.map((s) => s.trim()))) : [],
  )
  services?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];
}