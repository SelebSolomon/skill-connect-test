import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/register.dto';
import { ResendEmailToken } from './dto/send-email.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import type { Request } from 'express';
import { UpdatePasswordDto } from './dto/update-password-dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Patch('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification-email')
  async resendVerificationEmail(@Body('email') email: ResendEmailToken) {
    return this.authService.resendVerificationEmail(email.email);
  }

  // @UseGuards(JwtGuards)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Patch('refresh-token')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.authService.refreshAccessToken(body.refreshToken);
  }

  @UseGuards(JwtGuards)
  @Post('logout')
  async logout(@Req() req: Request & { user: { sub: string } }) {
    return await this.authService.logout(req.user.sub);
  }

  @UseGuards(JwtGuards)
  @Patch('update-password')
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return await this.authService.updatePassword(
      updatePasswordDto,
      req.user.sub,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body() email: ResendEmailToken) {
    return await this.authService.forgotPassword(email.email);
  }

  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(
      resetPasswordDto.resetToken,
      resetPasswordDto.newPassword,
    );
  }

  @UseGuards(JwtGuards)
  @Get('me')
  me(@Req() request: Request) {
    return {
      authenticated: true,
      user: request.user,
    };
  }
}
