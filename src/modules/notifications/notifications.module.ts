import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationSchema } from './schema/notification.schema';

/**
 * forwardRef is needed because NotificationsService → NotificationsGateway
 * and NotificationsGateway → NotificationsService (for socket read handlers).
 * Both live in the same module so there is no circular module dependency,
 * only a circular provider dependency — resolved by forwardRef on each side.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
