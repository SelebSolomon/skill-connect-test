import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  IsNumber,
  IsMongoId,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsStrongPassword,
  Matches,
  IsEnum,
} from 'class-validator';
import { RoleName } from 'src/common/enums/roles-enums';

export class CreateUserDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => value?.trim())
  @IsEmail()
  email: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  phone: string;

  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty()
  @IsStrongPassword()
  @Matches(/^(?=.*[0-9])/, {
    message: 'password must contain at least one number',
  })
  password: string;

  @IsOptional()
  @IsEnum(RoleName, {
    message: 'roleName must be a valid role',
  })
  roleName?: RoleName;

  @IsOptional()
  @IsMongoId()
  role?: string

}

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  password: string;

  // Admin role is always Admin
}
