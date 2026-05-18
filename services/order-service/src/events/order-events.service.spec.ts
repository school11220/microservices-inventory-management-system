import type { DomainEvent, StockFailedPayload } from '@inventory/contracts';
import { OrderEventsService } from './order-events.service';

function stockFailedEvent(): DomainEvent<StockFailedPayload> {
  return {
    eventId: 'stock-failed-1',
    type: 'StockFailed',
    source: 'inventory-service',
    correlationId: 'order-1',
    occurredAt: '2026-05-18T00:00:00.000Z',
    payload: {
      orderId: 'order-1',
      reason: 'Insufficient stock',
      items: [{ productId: 'product-1', requested: 4, available: 0 }],
    },
  };
}

function createService() {
  const tx = {
    processedEvent: { create: jest.fn() },
    order: { update: jest.fn() },
  };
  const prisma = {
    processedEvent: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const publisher = { publish: jest.fn().mockResolvedValue('event-1') };
  return {
    service: new OrderEventsService(prisma as never, publisher as never),
    prisma,
    tx,
    publisher,
  };
}

describe('OrderEventsService', () => {
  it('stores cancellation outcome before publishing it', async () => {
    const { service, prisma, tx, publisher } = createService();
    prisma.processedEvent.findUnique.mockResolvedValue(null);

    await expect(service.handleStockFailed(stockFailedEvent())).resolves.toEqual({
      status: 'failed',
    });

    expect(tx.processedEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'stock-failed-1',
        outcomeType: 'OrderCancelled',
        outcomePayload: expect.objectContaining({ orderId: 'order-1' }),
      }),
    });
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ failureReason: 'Insufficient stock' }),
      }),
    );
    expect(publisher.publish).toHaveBeenCalledWith(
      'OrderCancelled',
      expect.objectContaining({ orderId: 'order-1' }),
      'order-service',
      'order-1',
      'stock-failed-1:order-cancelled',
    );
  });

  it('republishes stored cancellation outcomes for duplicate deliveries', async () => {
    const { service, prisma, tx, publisher } = createService();
    prisma.processedEvent.findUnique.mockResolvedValue({
      eventId: 'stock-failed-1',
      type: 'StockFailed',
      outcomeType: 'OrderCancelled',
      outcomePayload: {
        orderId: 'order-1',
        reason: 'Insufficient stock',
        items: [{ productId: 'product-1', requested: 4, available: 0 }],
      },
    });

    await expect(service.handleStockFailed(stockFailedEvent())).resolves.toEqual({
      status: 'duplicate',
    });

    expect(tx.order.update).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      'OrderCancelled',
      expect.objectContaining({ orderId: 'order-1' }),
      'order-service',
      'order-1',
      'stock-failed-1:order-cancelled',
    );
  });
});
