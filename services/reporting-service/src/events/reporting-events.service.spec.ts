import type { DomainEvent, StockAdjustedPayload } from '@inventory/contracts';
import { ReportingEventsService } from './reporting-events.service';

function createTransactionClient() {
  return {
    reportEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    salesDaily: {
      upsert: jest.fn(),
    },
    inventorySnapshot: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    stockAlert: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function createService(tx = createTransactionClient()) {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return {
    service: new ReportingEventsService(prisma as never),
    prisma,
    tx,
  };
}

function stockAdjustedEvent(overrides: Partial<DomainEvent<StockAdjustedPayload>> = {}) {
  return {
    eventId: 'event-1',
    type: 'StockAdjusted',
    source: 'inventory-service',
    correlationId: 'product-1',
    occurredAt: '2026-05-01T12:00:00.000Z',
    payload: {
      productId: 'product-1',
      name: 'Scanner',
      category: 'Warehouse',
      stockLevel: 7,
      reorderThreshold: 3,
      delta: 2,
    },
    ...overrides,
  } as DomainEvent<StockAdjustedPayload>;
}

describe('ReportingEventsService', () => {
  it('stores the audit row and projection update in one transaction', async () => {
    const { service, prisma, tx } = createService();
    tx.reportEvent.findUnique.mockResolvedValue(null);

    await expect(service.ingest(stockAdjustedEvent())).resolves.toEqual({ status: 'processed' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.reportEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventId: 'event-1', type: 'StockAdjusted' }),
      }),
    );
    expect(tx.inventorySnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product-1' },
        update: expect.objectContaining({ stockLevel: 7, reorderThreshold: 3 }),
      }),
    );
  });

  it('does not apply projections twice for duplicate events', async () => {
    const { service, tx } = createService();
    tx.reportEvent.findUnique.mockResolvedValue({ eventId: 'event-1' });

    await expect(service.ingest(stockAdjustedEvent())).resolves.toEqual({ status: 'duplicate' });

    expect(tx.reportEvent.create).not.toHaveBeenCalled();
    expect(tx.inventorySnapshot.upsert).not.toHaveBeenCalled();
  });

  it('removes inventory snapshots and resolves alerts when products are deleted', async () => {
    const { service, tx } = createService();
    tx.reportEvent.findUnique.mockResolvedValue(null);

    await expect(
      service.ingest({
        eventId: 'event-2',
        type: 'ProductDeleted',
        source: 'inventory-service',
        correlationId: 'product-1',
        occurredAt: '2026-05-01T12:00:00.000Z',
        payload: { productId: 'product-1', name: 'Scanner', category: 'Warehouse' },
      }),
    ).resolves.toEqual({ status: 'processed' });

    expect(tx.inventorySnapshot.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
    });
    expect(tx.stockAlert.updateMany).toHaveBeenCalledWith({
      where: { productId: 'product-1', resolvedAt: null },
      data: { resolvedAt: new Date('2026-05-01T12:00:00.000Z') },
    });
  });
});
