import { AuthService } from './auth.service';
import { Role } from '../../src/generated/prisma';

describe('AuthService', () => {
  it('removes password hashes from user responses', () => {
    const service = new AuthService({} as never, {} as never);
    const safe = service.sanitize({
      id: 'u1',
      username: 'admin',
      passwordHash: 'secret',
      role: Role.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe.username).toBe('admin');
  });
});
