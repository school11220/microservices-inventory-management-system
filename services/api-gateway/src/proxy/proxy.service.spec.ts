import { ProxyService } from './proxy.service';

describe('ProxyService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('constructs without runtime dependencies', () => {
    expect(new ProxyService()).toBeInstanceOf(ProxyService);
  });

  it('strips the /api ingress prefix before forwarding upstream', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue('{"ok":true}'),
    } as unknown as Response);
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await new ProxyService().proxy(
      {
        path: '/api/auth/login',
        originalUrl: '/api/auth/login?source=ingress',
        method: 'POST',
        body: { username: 'admin', password: 'ChangeMe123!' },
        headers: {},
      } as any,
      response as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/auth/login?source=ingress',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
