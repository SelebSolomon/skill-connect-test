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
import { Inject, Logger, UseFilters, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { corsOriginFn } from '../../core/config/cors.config';

@WebSocketGateway({
  cors: { origin: corsOriginFn, credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** userId → Set of socketIds (a user can have multiple tabs open) */
  private readonly userSocketMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  // ─── Connection lifecycle ────────────────────────────────────────────────

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

      // Track multiple sockets per user
      if (!this.userSocketMap.has(payload.sub)) {
        this.userSocketMap.set(payload.sub, new Set());
      }
      this.userSocketMap.get(payload.sub)!.add(client.id);

      // Join a personal room so we can target this user easily
      await client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Unauthorized connection attempt — disconnecting ${client.id}`);
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
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Public helpers (used by MessagesService) ────────────────────────────

  /** Emit an event to all sockets belonging to a user */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isOnline(userId: string): boolean {
    return (this.userSocketMap.get(userId)?.size ?? 0) > 0;
  }

  // ─── Socket message handlers ─────────────────────────────────────────────

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateMessageDto,
  ) {
    const userId: string = client.data.userId;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const result = await this.messagesService.sendMessage(payload, userId);
      return { event: 'message:sent', data: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      throw new WsException(message);
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    const userId: string = client.data.userId;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const result = await this.messagesService.markMessageAsRead(
        payload.messageId,
        userId,
      );
      return { event: 'message:read_ack', data: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read';
      throw new WsException(message);
    }
  }

  /** Client joins a conversation room to receive real-time messages */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await client.join(`conversation:${payload.conversationId}`);
    return { event: 'conversation:joined', data: payload.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await client.leave(`conversation:${payload.conversationId}`);
  }
}
