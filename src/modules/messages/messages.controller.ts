import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { SendOfferDto } from './dto/send-offer.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { JwtPayload } from 'src/common/interface/jwt-payload';

type AuthRequest = Request & { user: JwtPayload };

@UseGuards(JwtGuards)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /messages
   * Send a new message to an existing conversation.
   */
  @Post()
  sendMessage(
    @Req() req: AuthRequest,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.sendMessage(createMessageDto, req.user.sub);
  }

  /**
   * GET /messages/:conversationId
   * Fetch all messages in a conversation (marks unread → 0 for caller).
   */
  @Get(':conversationId')
  getMessages(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.getMessages(conversationId, req.user.sub);
  }

  /**
   * PATCH /messages/:id/read
   * Mark a specific message as read by the caller.
   */
  @Patch(':id/read')
  markAsRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.messagesService.markMessageAsRead(id, req.user.sub);
  }

  /**
   * POST /messages/offer
   * Provider sends a formal price offer inside a conversation.
   */
  @Post('offer')
  sendOffer(@Req() req: AuthRequest, @Body() dto: SendOfferDto) {
    return this.messagesService.sendOffer(dto, req.user.sub);
  }

  /**
   * PATCH /messages/:id/accept-offer
   * Client accepts the provider's offer — creates an in_progress job automatically.
   */
  @Patch(':id/accept-offer')
  acceptOffer(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.messagesService.acceptOffer(id, req.user.sub);
  }

  /**
   * PATCH /messages/:id/decline-offer
   * Either party can decline a pending offer.
   */
  @Patch(':id/decline-offer')
  declineOffer(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.messagesService.declineOffer(id, req.user.sub);
  }
}
