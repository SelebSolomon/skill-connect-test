import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schema/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Persist + push a single notification in real time.
   * Silently swallows errors so a failure never breaks the caller.
   */
  async send(dto: CreateNotificationDto): Promise<void> {
    try {
      const notification = await this.notificationModel.create(dto);
      this.gateway.emitToUser(dto.userId, notification);
    } catch (err) {
      this.logger.error(
        `Failed to send notification to user ${dto.userId} [${dto.type}]`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /**
   * Persist + push the same notification to many users at once.
   */
  async sendToMany(
    userIds: string[],
    payload: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    if (!userIds.length) return;
    try {
      const docs = userIds.map((userId) => ({ ...payload, userId }));
      await this.notificationModel.insertMany(docs, { ordered: false });
      this.gateway.emitToMany(userIds, payload);
    } catch (err) {
      this.logger.error(
        `Failed to send bulk notifications to ${userIds.length} users [${payload.type}]`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (unreadOnly) filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v'),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    return { notifications, total, unreadCount, page, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
    return { count };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ message: string }> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async clearAll(userId: string): Promise<{ message: string }> {
    await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
    return { message: 'All notifications cleared' };
  }
}
