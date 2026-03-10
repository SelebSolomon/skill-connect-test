import { ProfileController } from './profile.controller';

describe('ProfileController', () => {
  it('should be defined', () => {
    const controller = new ProfileController({} as any);
    expect(controller).toBeDefined();
  });
});
