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
import { Message, MessageDocument, MessageType, OfferStatus } from './schema/message.schema';
import { ConversationDocument } from '../conversations/schema/conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { SendOfferDto } from './dto/send-offer.dto';
import { ChatGateway } from './chat.gateway';
import { ConversationsService } from '../conversations/conversations.service';
import { Job, JobDocument } from '../jobs/schema/job.schema';
import { Status } from '../jobs/enums/status.enum';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

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

  // ─── Offers ───────────────────────────────────────────────────────────────

  /**
   * Provider sends a formal price offer inside a conversation.
   * Only one pending offer is allowed per conversation at a time.
   */
  async sendOffer(dto: SendOfferDto, senderId: string) {
    const { conversationId, price, description, deliveryDays, serviceId } = dto;

    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversationId');
    }

    const conversation = await this.conversationService.getConversationById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    this.assertParticipant(conversation, senderId);

    // Only one pending offer at a time in this conversation
    const existing = await this.messageModel.findOne({
      conversationId: new Types.ObjectId(conversationId),
      type: MessageType.Offer,
      'offer.status': OfferStatus.Pending,
    });
    if (existing) {
      throw new BadRequestException(
        'There is already a pending offer in this conversation. Wait for it to be accepted or declined first.',
      );
    }

    const offerMessage = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      type: MessageType.Offer,
      content: `Offer: ${description} — ₦${price.toLocaleString()} · ${deliveryDays} day(s)`,
      offer: { price, description, deliveryDays, serviceId, status: OfferStatus.Pending },
      readBy: [new Types.ObjectId(senderId)],
    });

    // Update conversation preview
    conversation.lastMessage = {
      messageId: offerMessage._id as Types.ObjectId,
      text: `💼 Offer: ₦${price.toLocaleString()}`,
      sentAt: new Date(),
    };
    conversation.participants.forEach((p) => {
      const uid = p.userId.toString();
      if (uid !== senderId) conversation.unread.set(uid, (conversation.unread.get(uid) ?? 0) + 1);
    });
    await conversation.save();

    const payload = {
      conversationId,
      message: this.formatMessage(offerMessage),
      conversationPreview: conversation.lastMessage,
    };

    conversation.participants.forEach((p) => {
      const uid = p.userId.toString();
      if (uid !== senderId) this.chatGateway.emitToUser(uid, 'message:new', payload);
    });
    this.chatGateway.server.to(`conversation:${conversationId}`).emit('message:new', payload);

    return { message: this.formatMessage(offerMessage) };
  }

  /**
   * The OTHER party (client) accepts the offer.
   * Creates an in_progress job. Commission is charged when the client later marks it complete.
   */
  async acceptOffer(messageId: string, userId: string) {
    if (!isValidObjectId(messageId)) throw new BadRequestException('Invalid message ID');

    const msg = await this.messageModel.findById(messageId);
    if (!msg || msg.type !== MessageType.Offer) throw new NotFoundException('Offer not found');
    if (msg.offer?.status !== OfferStatus.Pending) {
      throw new BadRequestException('This offer is no longer pending');
    }
    if (msg.senderId.toString() === userId) {
      throw new ForbiddenException('You cannot accept your own offer');
    }

    const conversation = await this.conversationService.getConversationById(
      msg.conversationId.toString(),
    );
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);

    // userId is the client; senderId is the provider
    const providerId = msg.senderId.toString();
    const clientId = userId;

    // Create the job directly in-progress
    const job = await this.jobModel.create({
      clientId: new Types.ObjectId(clientId),
      providerId: new Types.ObjectId(providerId),
      serviceId: new Types.ObjectId(msg.offer.serviceId),
      title: msg.offer.description.slice(0, 100),
      description: msg.offer.description,
      budget: msg.offer.price,
      agreedPrice: msg.offer.price,
      jobLocation: 'Direct Agreement',
      status: Status.in_progress,
      assignedDate: new Date(),
    });

    // Mark offer as accepted and link the job
    msg.offer.status = OfferStatus.Accepted;
    msg.offer.jobId = job._id as Types.ObjectId;
    msg.markModified('offer');
    await msg.save();

    // Also link the job to the conversation so both parties can navigate to it
    conversation.jobId = job._id as Types.ObjectId;
    await conversation.save();

    // Notify both parties
    const offerUpdate = { messageId, status: OfferStatus.Accepted, jobId: job._id };
    conversation.participants.forEach((p) => {
      this.chatGateway.emitToUser(p.userId.toString(), 'offer:updated', offerUpdate);
    });

    return { job, offer: msg.offer };
  }

  /**
   * Either party can decline a pending offer.
   */
  async declineOffer(messageId: string, userId: string) {
    if (!isValidObjectId(messageId)) throw new BadRequestException('Invalid message ID');

    const msg = await this.messageModel.findById(messageId);
    if (!msg || msg.type !== MessageType.Offer) throw new NotFoundException('Offer not found');
    if (msg.offer?.status !== OfferStatus.Pending) {
      throw new BadRequestException('This offer is no longer pending');
    }

    const conversation = await this.conversationService.getConversationById(
      msg.conversationId.toString(),
    );
    if (!conversation) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conversation, userId);

    msg.offer.status = OfferStatus.Declined;
    msg.markModified('offer');
    await msg.save();

    const offerUpdate = { messageId, status: OfferStatus.Declined };
    conversation.participants.forEach((p) => {
      this.chatGateway.emitToUser(p.userId.toString(), 'offer:updated', offerUpdate);
    });

    return { offer: msg.offer };
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
      type: msg.type,
      content: msg.content,
      offer: msg.offer ?? null,
      attachments: msg.attachments,
      readBy: msg.readBy,
      createdAt: (msg as unknown as { createdAt: Date }).createdAt,
    };
  }
}
