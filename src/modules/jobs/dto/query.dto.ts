import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseQueryDto } from '../../../common/utils/dto/query-base.dto';
import { Status } from '../enums/status.enum';

/**
 * All base query params (page, limit, sort, fields, search, location)
 * are inherited from BaseQueryDto automatically.
 */
export class JobQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: Status, description: 'Filter by job status' })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ description: 'Filter by service ID' })
  @IsOptional()
  @IsMongoId()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by provider ID' })
  @IsOptional()
  @IsMongoId()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Minimum budget' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  'budget[gte]'?: number;

  @ApiPropertyOptional({ description: 'Maximum budget' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  'budget[lte]'?: number;
}
