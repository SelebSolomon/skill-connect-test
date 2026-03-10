import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { Message, MessageDocument } from '../messages/schema/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UsersService } from '../users/users.service';
import { RoleService } from 'src/shared/role/role.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,

    @Inject(forwardRef(() => MessagesService))
    private messageService: MessagesService,

    private readonly usersService: UsersService,
    private readonly roleService: RoleService,
  ) {}

  async getConversationById(id: string) {
    return this.conversationModel.findById(id);
  }

  async findConversationByMessageConversation(
    message_conversationId: Types.ObjectId,
    userId: string,
  ) {
    return await this.conversationModel.findOne({
      _id: message_conversationId,
      'participants.userId': new Types.ObjectId(userId),
    });
  }
  // ─── Start or return existing conversation ───────────────────────────────

  async startNewConversation(
    dto: CreateConversationDto,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const { recipientId, jobId } = dto;

    if (currentUserId === recipientId) {
      throw new BadRequestException(
        'You cannot start a conversation with yourself',
      );
    }

    const [recipient, role] = await Promise.all([
      this.usersService.findById(recipientId),
      this.roleService.findByIdOrFail(currentUserRole),
    ]);

    if (!recipient) throw new NotFoundException('Recipient not found');

    // Return existing conversation if one already exists
    const existing = await this.conversationModel
      .findOne({
        'participants.userId': { $all: [currentUserId, recipientId] },
        jobId: jobId ?? null,
      })
      .populate({
        path: 'participants.userId',
        select: 'name profile',
        populate: { path: 'profile', select: 'photoUrl rating' },
      })
      .populate('jobId', 'title')
      .lean();

    if (existing) return { data: existing, isNew: false };

    const newConversation = await this.conversationModel.create({
      participants: [
        { userId: new Types.ObjectId(currentUserId), role: role.name },
        { userId: new Types.ObjectId(recipientId), role: recipient.roleName },
      ],
      ...(jobId
        ? { jobId: new Types.ObjectId(jobId as unknown as string) }
        : {}),
      unread: new Map([
        [currentUserId, 0],
        [recipientId, 0],
      ]),
      archived: new Map([
        [currentUserId, false],
        [recipientId, false],
      ]),
    });

    const doc = newConversation as unknown as ConversationDocument;

    const populated = await this.conversationModel
      .findById(doc._id)
      .select('_id participants jobId lastMessage createdAt')
      .populate({
        path: 'participants.userId',
        select: 'name profile',
        populate: { path: 'profile', select: 'photoUrl rating' },
      })
      .populate('jobId', 'title')
      .lean();

    return { data: populated, isNew: true };
  }

  // ─── List all conversations for logged-in user ───────────────────────────

  async listOfConversations(userId: string) {
    const rawConversations = await this.conversationModel
      .find({
        'participants.userId': new Types.ObjectId(userId),
        [`archived.${userId}`]: { $ne: true },
      })
      .sort({ 'lastMessage.sentAt': -1 })
      .populate({
        path: 'participants.userId',
        select: 'name profile',
        populate: { path: 'profile', select: 'photoUrl rating' },
      })
      .populate('jobId', 'title status')
      .lean();

    // Expose only this user's unread count per conversation (not the whole map)
    return rawConversations.map((c) => {
      const unreadMap = c.unread as unknown as Record<string, number>;
      return {
        ...c,
        unread: unreadMap?.[userId] ?? 0,
        archived: undefined,
      };
    });
  }

  // ─── Get a single chat room with its messages ────────────────────────────

  async getAChatRoom(conversationId: string, userId: string) {
    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate({
        path: 'participants.userId',
        select: 'name profile',
        populate: { path: 'profile', select: 'photoUrl rating' },
      })
      .populate('jobId', 'title status');

    if (!conversation) throw new NotFoundException('Conversation not found');

    this.assertParticipant(conversation, userId);

    // Fetch messages oldest → newest, with sender info
    const messages =
      await this.messageService.findByConversation(conversationId);
    // Reset unread counter and stamp lastReadAt for this participant
    conversation.unread.set(userId, 0);

    const idx = conversation.participants.findIndex(
      (p) => p.userId.toString() === userId,
    );
    if (idx !== -1) conversation.participants[idx].lastReadAt = new Date();

    await conversation.save();

    return { conversation, messages };
  }

  // ─── Archive / unarchive a conversation ──────────────────────────────────

  async archiveConversation(
    conversationId: string,
    userId: string,
    archive: boolean,
  ) {
    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    this.assertParticipant(conversation, userId);

    conversation.archived.set(userId, archive);
    await conversation.save();

    return { conversationId, archived: archive };
  }

  // ─── Mark all messages in a conversation as read ─────────────────────────

  async markAllAsRead(conversationId: string, userId: string) {
    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    this.assertParticipant(conversation, userId);

    conversation.unread.set(userId, 0);

    const idx = conversation.participants.findIndex(
      (p) => p.userId.toString() === userId,
    );
    if (idx !== -1) conversation.participants[idx].lastReadAt = new Date();

    await conversation.save();

    return { conversationId, unread: 0 };
  }

  // ─── Private helper ───────────────────────────────────────────────────────

  private assertParticipant(
    conversation: ConversationDocument,
    userId: string,
  ) {
    const ok = conversation.participants.some(
      (p) => p.userId._id.toString() === userId.toString(),
    );

    if (!ok) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
  }
}
