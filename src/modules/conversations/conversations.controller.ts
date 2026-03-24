import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { JwtPayload } from 'src/common/interface/jwt-payload';
import { IsBoolean } from 'class-validator';

class ArchiveDto {
  @IsBoolean()
  archive: boolean;
}

type AuthRequest = Request & { user: JwtPayload };

@UseGuards(JwtGuards)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * POST /conversations
   * Start a new conversation (or return existing one).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  startNewConversation(
    @Req() req: AuthRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.startNewConversation(
      dto,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * GET /conversations
   * List all non-archived conversations, sorted by latest message.
   * Each item exposes only the caller's unread count.
   */
  @Get()
  listOfConversations(@Req() req: AuthRequest) {
    return this.conversationsService.listOfConversations(req.user.sub);
  }

  /**
   * GET /conversations/:id
   * Open a chat room — returns conversation metadata + all messages.
   * Resets the caller's unread counter to 0.
   */
  @Get(':id')
  getAChatRoom(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.conversationsService.getAChatRoom(id, req.user.sub);
  }

  /**
   * PATCH /conversations/:id/archive
   * Archive or unarchive a conversation for the caller only.
   * Body: { archive: true | false }
   */
  @Patch(':id/archive')
  archiveConversation(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: ArchiveDto,
  ) {
    return this.conversationsService.archiveConversation(
      id,
      req.user.sub,
      body.archive,
    );
  }

  /**
   * PATCH /conversations/:id/read
   * Mark all messages in a conversation as read for the caller.
   */
  @Patch(':id/read')
  markAllAsRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.conversationsService.markAllAsRead(id, req.user.sub);
  }

  /**
   * DELETE /conversations/:id
   * Permanently delete a conversation and all its messages.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteConversation(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.conversationsService.deleteConversation(id, req.user.sub);
  }
}
