import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
