import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schema/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Internal helper used by other services to fire a single notification.
   * Silently swallows errors so a failure never breaks the caller.
   */
  async send(dto: CreateNotificationDto): Promise<void> {
    try {
      await this.notificationModel.create(dto);
    } catch {
      // notification errors must never surface to the caller
    }
  }

  /**
   * Bulk-send the same notification to many users (e.g. job posted → all matching providers).
   */
  async sendToMany(
    userIds: string[],
    payload: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    if (!userIds.length) return;
    try {
      const docs = userIds.map((userId) => ({ ...payload, userId }));
      await this.notificationModel.insertMany(docs, { ordered: false });
    } catch {
      // swallow
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
