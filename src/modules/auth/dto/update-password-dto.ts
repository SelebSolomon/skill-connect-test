import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty()
  @IsStrongPassword()
  @Matches(/^(?=.*[0-9])/, {
    message: 'password must contain at least one number',
  })
  newPassword: string;
}
