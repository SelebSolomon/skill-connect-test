import { IsEmail, IsString } from 'class-validator';

export class ResendEmailToken {
  @IsEmail()
  @IsString()
  email: string;
}
