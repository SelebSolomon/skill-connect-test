import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Base query DTO — extend this in each module for domain-specific filters.
 *
 * @example
 * export class JobQueryDto extends BaseQueryDto {
 *   @IsOptional()
 *   @IsEnum(Status)
 *   status?: Status;
 *
 *   @IsOptional()
 *   @IsMongoId()
 *   serviceId?: string;
 * }
 */
export class BaseQueryDto {
  @ApiPropertyOptional({ description: 'Page number (min: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max: 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort fields, comma-separated. Prefix with - for descending.',
    example: '-createdAt,title',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Fields to include, comma-separated',
    example: 'title,status,jobLocation',
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({
    description: 'Full-text search across configured fields',
    example: 'plumbing',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by location (partial match)',
    example: 'Lagos',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  location?: string;

  // Allow arbitrary extra fields for dynamic filters (e.g. ?status=open)
  [key: string]: any;
}
