import { JobsController } from './jobs.controller';

describe('JobsController', () => {
  it('should be defined', () => {
    const controller = new JobsController({} as any);
    expect(controller).toBeDefined();
  });
});
