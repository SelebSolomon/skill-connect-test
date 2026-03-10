import { ConversationsController } from './conversations.controller';

describe('ConversationsController', () => {
  it('should be defined', () => {
    const controller = new ConversationsController({} as any);
    expect(controller).toBeDefined();
  });
});
