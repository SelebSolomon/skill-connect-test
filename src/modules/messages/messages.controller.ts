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
}
