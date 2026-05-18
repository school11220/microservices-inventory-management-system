import { EventsService } from './events.service';

describe('EventsService', () => {
  const createService = (eventStoreOverrides = {}) =>
    new EventsService(
      {
        enabled: false,
        append: jest.fn(),
        list: jest.fn(),
        markDelivered: jest.fn(),
        markFailed: jest.fn(),
        dueDeliveries: jest.fn(),
        ...eventStoreOverrides,
      } as never,
      {
        status: { enabled: false, connected: false, brokers: null, topic: 'test' },
        publish: jest.fn(),
      } as never,
    );

  it('exposes subscriptions for order-created events', () => {
    const service = createService();
    expect(service.subscriptions().subscribers.OrderCreated.length).toBeGreaterThanOrEqual(1);
    expect(service.subscriptions().subscribers.ProductDeleted).toEqual([
      expect.objectContaining({ service: 'reporting-service' }),
    ]);
  });

  it('does not crash when durable retry lookup fails', async () => {
    const service = createService({
      enabled: true,
      dueDeliveries: jest.fn().mockRejectedValue(new Error('temporary database failure')),
    }) as unknown as { retryPendingDeliveries: () => Promise<void> };

    await expect(service.retryPendingDeliveries()).resolves.toBeUndefined();
  });
});
