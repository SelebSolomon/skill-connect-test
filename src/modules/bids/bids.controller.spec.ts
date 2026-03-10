import { BidsController } from './bids.controller';

describe('BidsController', () => {
  it('should be defined', () => {
    const controller = new BidsController({} as any);
    expect(controller).toBeDefined();
  });
});
