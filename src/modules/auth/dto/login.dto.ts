import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'Invalid email address' })
  @IsString({ message: 'Email must be a string' })
  email?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty()
  @IsStrongPassword()
  @Matches(/^(?=.*[0-9])/, {
    message: 'password must contain at least one number',
  })
  password: string;
}
