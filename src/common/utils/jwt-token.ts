import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interface/jwt-payload';
import { ConfigService } from '@nestjs/config';

export const signAccessToken = async (
  jwtService: JwtService,
  userId: string,
  role: string,
  email: string,
): Promise<string> => {
  const payload: JwtPayload = {
    sub: userId,
    role,
    email,
  };

  return jwtService.signAsync(payload);
};

export const signRefreshToken = async (
  jwtService: JwtService,
  userId: string,
  configService: ConfigService,
): Promise<string> => {
  const payload = {
    sub: userId,
    type: 'refresh',
  };

  return jwtService.signAsync(payload, {
    expiresIn: '7d',
    secret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'), // 🔑 use a separate  secret for refresh tokens
  });
};
