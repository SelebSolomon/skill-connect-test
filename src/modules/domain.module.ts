import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import dbConfig from 'src/core/config/db.config';
import { RoleModule } from 'src/shared/role/role.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ProfileModule } from './profile/profile.module';
import { CloudinaryModule } from 'src/shared/cloudinary/cloudinary.module';
import { ServicesModule } from './services/services.module';
import { BootstrapService } from 'src/bootstrap/bootstrap.service';
import { JobsModule } from './jobs/jobs.module';
import { BidsModule } from './bids/bids.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TransactionsModule } from './transactions/transactions.module';
import { LoggerMiddleware } from 'src/core/middleware/loggerMIddleware';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { WalletModule } from './wallet/wallet.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 5,
      },
    ]),
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
    MessagesModule,
    ReviewsModule,
    NotificationsModule,
    TransactionsModule,
    AdminModule,
    ReportsModule,
    WalletModule,
    AnalyticsModule,
    SettingsModule,
  ],
  controllers: [],
  providers: [BootstrapService],
  exports: [],
})
export class DomainModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes();
  }
}
