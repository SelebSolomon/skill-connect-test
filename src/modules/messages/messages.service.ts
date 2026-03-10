import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schema/message.schema';
import { ConversationDocument } from '../conversations/schema/conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatGateway } from './chat.gateway';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    @Inject(forwardRef(() => ConversationsService))
    private conversationService: ConversationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async findByConversation(conversationId: string) {
    const messages = await this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name profile')
      .lean();

    return messages;
  }
  // ─── Send a message ───────────────────────────────────────────────────────

  async sendMessage(dto: CreateMessageDto, senderId: string) {
    const { conversationId, content, attachments } = dto;

    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversationId');
    }

    // Guard: content or attachment required
    if (!content && (!attachments || attachments.length === 0)) {
      throw new BadRequestException(
        'Message must have content or at least one attachment',
      );
    }

    const conversation =
      await this.conversationService.getConversationById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    this.assertParticipant(conversation, senderId);

    // Create the message
    const newMessage = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      content: content ?? '',
      attachments: attachments ?? [],
      readBy: [new Types.ObjectId(senderId)],
    });

    // Build preview text
    const previewText = content || (attachments?.length ? '📎 Attachment' : '');

    conversation.lastMessage = {
      messageId: newMessage._id as Types.ObjectId,
      text: previewText,
      sentAt: new Date(),
    };

    // Update unread counts
    conversation.participants.forEach((p) => {
      const uid = p.userId.toString();
      if (uid === senderId) {
        conversation.unread.set(uid, 0);
      } else {
        conversation.unread.set(uid, (conversation.unread.get(uid) ?? 0) + 1);
      }
    });

    await conversation.save();

    // Emit real-time events to all other participants
    const payload = {
      conversationId,
      message: this.formatMessage(newMessage),
      conversationPreview: conversation.lastMessage,
    };

    conversation.participants.forEach((p) => {
      const uid = p.userId.toString();
      if (uid !== senderId) {
        this.chatGateway.emitToUser(uid, 'message:new', payload);
      }
    });

    // Also broadcast to anyone in the conversation room (e.g. both parties have the chat open)
    this.chatGateway.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', payload);

    return {
      message: this.formatMessage(newMessage),
      conversation: conversation.lastMessage,
    };
  }

  // ─── Get messages ─────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string) {
    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversationId');
    }

    const conversation =
      await this.conversationService.getConversationById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    this.assertParticipant(conversation, userId);

    const messages = await this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name')
      .lean();

    // Reset unread for this user
    conversation.unread.set(userId, 0);
    await conversation.save();

    return messages;
  }

  // ─── Mark a single message as read ───────────────────────────────────────

  async markMessageAsRead(messageId: string, userId: string) {
    if (!isValidObjectId(messageId)) {
      throw new BadRequestException('Invalid messageId');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    // const conversation = await this.conversationModel.findOne({
    //   _id: message.conversationId,
    //   'participants.userId': new Types.ObjectId(userId),
    // });
    const conversation =
      await this.conversationService.findConversationByMessageConversation(
        message.conversationId,
        userId,
      );

    if (!conversation) {
      throw new ForbiddenException('You do not belong to this conversation');
    }

    const alreadyRead = message.readBy.some((id) => id.toString() === userId);

    if (!alreadyRead) {
      message.readBy.push(new Types.ObjectId(userId));
      await message.save();

      const prev = conversation.unread.get(userId) ?? 0;
      conversation.unread.set(userId, Math.max(prev - 1, 0));
      await conversation.save();

      // Notify other participants that the message was read
      conversation.participants.forEach((p) => {
        const uid = p.userId.toString();
        if (uid !== userId) {
          this.chatGateway.emitToUser(uid, 'message:read', {
            messageId: message._id,
            readerId: userId,
          });
        }
      });
    }

    return {
      messageId: message._id,
      readBy: message.readBy,
      unread: conversation.unread.get(userId) ?? 0,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private assertParticipant(
    conversation: ConversationDocument,
    userId: string,
  ) {
    const isParticipant = conversation.participants.some(
      (p) => p.userId.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
  }

  private formatMessage(msg: MessageDocument) {
    return {
      _id: msg._id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      attachments: msg.attachments,
      readBy: msg.readBy,
      createdAt: (msg as unknown as { createdAt: Date }).createdAt,
    };
  }
}
