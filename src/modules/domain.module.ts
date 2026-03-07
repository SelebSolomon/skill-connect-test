import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import dbConfig from 'src/core/config/db.config';
import { RoleModule } from 'src/shared/role/role.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';
import { ProfileModule } from './profile/profile.module';
import { CloudinaryModule } from 'src/shared/cloudinary/cloudinary.module';
import { ServicesModule } from './services/services.module';
import { BootstrapService } from 'src/bootstrap/bootstrap.service';
import { JobsModule } from './jobs/jobs.module';
import { BidsModule } from './bids/bids.module';
import { ConversationsModule } from './conversations/conversations.module';

// import authConstants from 'src/common/constants/auth.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig],
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
      }),
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
        connectionFactory: (connection: unknown) => {
          console.log('database connected');
          return connection;
        },
      }),
    }),
    RoleModule,
    UsersModule,
    AuthModule,
    PassportModule,
    ProfileModule,
    CloudinaryModule,
    ServicesModule,
    JobsModule,
    BidsModule,
    ConversationsModule,

  ],
  controllers: [],
  providers: [BootstrapService],
  exports: [],
})
export class DomainModule {}
