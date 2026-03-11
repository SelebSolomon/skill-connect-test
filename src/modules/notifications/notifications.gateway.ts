import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /** userId → Set<socketId> — supports multiple tabs / devices */
  private readonly userSocketMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '') ?? '');

      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.userId = payload.sub;

      if (!this.userSocketMap.has(payload.sub)) {
        this.userSocketMap.set(payload.sub, new Set());
      }
      this.userSocketMap.get(payload.sub)!.add(client.id);

      // Each user joins a personal room — used by emitToUser()
      await client.join(`user:${payload.sub}`);

      this.logger.log(`[notifications] connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.emit('exception', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data.userId;
    if (userId) {
      const sockets = this.userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSocketMap.delete(userId);
      }
    }
    this.logger.log(`[notifications] disconnected: ${client.id}`);
  }

  // ─── Public helpers — called by NotificationsService ───────────────────────

  /** Push a single notification to all of a user's connected clients */
  emitToUser(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  /** Push to a list of users (e.g. job posted → matching providers) */
  emitToMany(userIds: string[], notification: unknown) {
    for (const userId of userIds) {
      this.emitToUser(userId, notification);
    }
  }

  isOnline(userId: string): boolean {
    return (this.userSocketMap.get(userId)?.size ?? 0) > 0;
  }

  // ─── Socket event handlers ──────────────────────────────────────────────────

  /**
   * notification:read  { id: string }
   * Marks one notification as read and acknowledges the client.
   */
  @SubscribeMessage('notification:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string },
  ) {
    const userId: string = client.data.userId;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const notification = await this.notificationsService.markAsRead(
        payload.id,
        userId,
      );
      return { event: 'notification:read_ack', data: notification };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read';
      throw new WsException(message);
    }
  }

  /**
   * notification:read_all
   * Marks every notification for the connected user as read.
   */
  @SubscribeMessage('notification:read_all')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const userId: string = client.data.userId;
    if (!userId) throw new WsException('Unauthorized');

    try {
      await this.notificationsService.markAllAsRead(userId);
      // Tell all tabs of this user that the badge should reset
      this.server
        .to(`user:${userId}`)
        .emit('notification:all_read', { userId });
      return { event: 'notification:all_read_ack' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      throw new WsException(message);
    }
  }
}
