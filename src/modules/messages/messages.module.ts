import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ChatGateway } from './chat.gateway';
import { Message, MessageSchema } from './schema/message.schema';
import { ConversationsModule } from '../conversations/conversations.module';
import { Job, JobSchema } from '../jobs/schema/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Job.name, schema: JobSchema },
    ]),
    forwardRef(() => ConversationsModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, ChatGateway],
  exports: [MessagesService, ChatGateway],
})
export class MessagesModule {}
