import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsBoolean()
  shareLocation?: boolean;

  /** Preferred search radius in kilometres (1–500) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  locationRadius?: number;
}
