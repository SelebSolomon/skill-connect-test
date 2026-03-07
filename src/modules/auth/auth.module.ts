import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RoleModule } from 'src/shared/role/role.module';
import { EmailService } from 'src/shared/email/email.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';


@Module({
  imports: [UsersModule, RoleModule],
  controllers: [AuthController],
  providers: [AuthService, Logger, EmailService,  JwtStrategy],
  exports: [AuthService]
})
export class AuthModule {}
