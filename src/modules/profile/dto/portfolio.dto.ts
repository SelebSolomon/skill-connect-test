import { IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class PortfolioItemDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  publicId?: string;

  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  link?: string;

  /**
   * Returns true if the portfolio item has at least one meaningful field
   */
  // hasContent(): boolean {
  //   return !!(this.title || this.description || this.imageUrl || this.link);
  // }
}
