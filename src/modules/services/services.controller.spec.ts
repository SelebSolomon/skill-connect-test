import { ServicesController } from './services.controller';

describe('ServicesController', () => {
  it('should be defined', () => {
    const controller = new ServicesController({} as any);
    expect(controller).toBeDefined();
  });
});
