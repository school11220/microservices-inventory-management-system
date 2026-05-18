import type { DomainEvent, OrderCreatedPayload } from '@inventory/contracts';
import { InventoryEventsService } from './inventory-events.service';

function product(overrides = {}) {
  return {
    id: 'product-1',
    name: 'Scanner',
    category: 'Warehouse',
    price: 100,
    stockLevel: 3,
    reorderThreshold: 3,
    version: 1,
    ...overrides,
  };
}

function orderCreatedEvent(): DomainEvent<OrderCreatedPayload> {
  return {
    eventId: 'order-created-1',
    type: 'OrderCreated',
    source: 'order-service',
    correlationId: 'order-1',
    occurredAt: '2026-05-18T00:00:00.000Z',
    payload: {
      orderId: 'order-1',
      total: 100,
      customerInfo: { name: 'Aarav Retail LLP' },
      items: [{ productId: 'product-1', quantity: 1 }],
    },
  };
}

function createService() {
  const tx = {
    processedEvent: { create: jest.fn() },
    product: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    processedEvent: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const publisher = { publish: jest.fn().mockResolvedValue('event-1') };
  return {
    service: new InventoryEventsService(prisma as never, publisher as never),
    prisma,
    tx,
    publisher,
  };
}

describe('InventoryEventsService', () => {
  it('records the stock outcome before publishing deterministic follow-up events', async () => {
    const { service, prisma, tx, publisher } = createService();
    prisma.processedEvent.findUnique.mockResolvedValue(null);
    tx.product.findUnique.mockResolvedValue(product());
    tx.product.findUniqueOrThrow.mockResolvedValue(product());
    tx.product.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.handleOrderCreated(orderCreatedEvent())).resolves.toEqual({
      status: 'stock_succeeded',
      items: [
        expect.objectContaining({
          productId: 'product-1',
          remainingStock: 2,
          reorderThreshold: 3,
        }),
      ],
    });

    expect(tx.processedEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'order-created-1',
        outcomeType: 'StockSucceeded',
        outcomePayload: expect.objectContaining({ orderId: 'order-1' }),
        lowStockPayloads: [expect.objectContaining({ productId: 'product-1', stockLevel: 2 })],
      }),
    });
    expect(publisher.publish).toHaveBeenNthCalledWith(
      1,
      'StockSucceeded',
      expect.objectContaining({ orderId: 'order-1' }),
      'inventory-service',
      'order-1',
      'order-created-1:stock-succeeded',
    );
    expect(publisher.publish).toHaveBeenNthCalledWith(
      2,
      'StockLow',
      expect.objectContaining({ productId: 'product-1', stockLevel: 2 }),
      'inventory-service',
      'order-1',
      'order-created-1:stock-low:product-1',
    );
  });

  it('republishes stored outcomes for duplicate deliveries without reserving stock again', async () => {
    const { service, prisma, tx, publisher } = createService();
    prisma.processedEvent.findUnique.mockResolvedValue({
      eventId: 'order-created-1',
      type: 'OrderCreated',
      outcomeType: 'StockFailed',
      outcomePayload: {
        orderId: 'order-1',
        reason: 'Insufficient stock',
        items: [{ productId: 'product-1', requested: 5, available: 0 }],
      },
      lowStockPayloads: null,
    });

    await expect(service.handleOrderCreated(orderCreatedEvent())).resolves.toEqual({
      status: 'duplicate',
      outcome: 'StockFailed',
    });

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      'StockFailed',
      expect.objectContaining({ orderId: 'order-1', reason: 'Insufficient stock' }),
      'inventory-service',
      'order-1',
      'order-created-1:stock-failed',
    );
  });
});
