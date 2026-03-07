import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LocationDto } from './location.dto';
import { PortfolioItemDto } from './portfolio.dto';

export class CreateProfileDto {
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
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? Array.from(new Set(value.map((s) => s.trim()))) : [],
  )
  services?: string[]; // service IDs

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  photoPublicId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];
}
