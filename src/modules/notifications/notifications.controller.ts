import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuards } from 'src/core/guards/jwt-guards';

@Controller('notifications')
@UseGuards(JwtGuards)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** GET /notifications?page=1&limit=20&unreadOnly=true */
  @Get()
  getMyNotifications(
    @Req() req: Request & { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.sub,
      page ? +page : 1,
      limit ? +limit : 20,
      unreadOnly === 'true',
    );
  }

  /** GET /notifications/unread-count */
  @Get('unread-count')
  getUnreadCount(@Req() req: Request & { user: { sub: string } }) {
    return this.notificationsService.getUnreadCount(req.user.sub);
  }

  /** PATCH /notifications/read-all */
  @Patch('read-all')
  markAllAsRead(@Req() req: Request & { user: { sub: string } }) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }

  /** PATCH /notifications/:id/read */
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  /** DELETE /notifications — clears all notifications for the current user */
  @Delete()
  clearAll(@Req() req: Request & { user: { sub: string } }) {
    return this.notificationsService.clearAll(req.user.sub);
  }
}
