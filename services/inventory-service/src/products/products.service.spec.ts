import { ProductsService } from './products.service';

function makeProduct(overrides = {}) {
  return {
    id: 'product-1',
    name: 'Scanner',
    description: 'Warehouse scanner',
    price: 2499,
    category: 'Warehouse',
    stockLevel: 5,
    reorderThreshold: 2,
    imageUrl: null,
    version: 1,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createService() {
  const prisma = {
    $transaction: jest.fn((operations) => Promise.all(operations)),
    product: {
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const publisher = { publish: jest.fn().mockResolvedValue('event-1') };
  const search = {
    search: jest.fn().mockResolvedValue(undefined),
    index: jest.fn(),
    delete: jest.fn(),
  };
  return {
    service: new ProductsService(prisma as never, publisher as never, search as never),
    prisma,
    publisher,
    search,
  };
}

describe('ProductsService projection events', () => {
  it('returns PostgreSQL category facets when the search backend is disabled', async () => {
    const { service, prisma } = createService();
    prisma.product.findMany.mockResolvedValue([makeProduct()]);
    prisma.product.count.mockResolvedValue(1);
    prisma.product.groupBy.mockResolvedValue([{ category: 'Warehouse', _count: { category: 1 } }]);

    await expect(service.list({ page: 1, limit: 10 })).resolves.toMatchObject({
      products: [expect.objectContaining({ id: 'product-1', category: 'Warehouse' })],
      facets: { categories: [{ category: 'Warehouse', count: 1 }] },
      total: 1,
      totalPages: 1,
    });
  });

  it('emits stock and low-stock events when a product is created below threshold', async () => {
    const { service, prisma, publisher } = createService();
    prisma.product.create.mockResolvedValue(makeProduct({ stockLevel: 1, reorderThreshold: 3 }));

    await service.create({
      name: 'Scanner',
      category: 'Warehouse',
      price: 2499,
      stockLevel: 1,
      reorderThreshold: 3,
    });

    expect(publisher.publish).toHaveBeenNthCalledWith(
      1,
      'StockAdjusted',
      expect.objectContaining({ productId: 'product-1', stockLevel: 1, delta: 1 }),
      'inventory-service',
      'product-1',
    );
    expect(publisher.publish).toHaveBeenNthCalledWith(
      2,
      'StockLow',
      expect.objectContaining({ productId: 'product-1', stockLevel: 1, reorderThreshold: 3 }),
      'inventory-service',
      'product-1',
    );
  });

  it('emits stock projection updates when editable reporting fields change', async () => {
    const { service, prisma, publisher } = createService();
    prisma.product.findUnique.mockResolvedValue(
      makeProduct({ stockLevel: 5, reorderThreshold: 3 }),
    );
    prisma.product.update.mockResolvedValue(
      makeProduct({ name: 'Updated Scanner', stockLevel: 2, reorderThreshold: 3, version: 2 }),
    );

    await service.update('product-1', { name: 'Updated Scanner', stockLevel: 2 });

    expect(publisher.publish).toHaveBeenNthCalledWith(
      1,
      'StockAdjusted',
      expect.objectContaining({
        productId: 'product-1',
        name: 'Updated Scanner',
        stockLevel: 2,
        delta: -3,
      }),
      'inventory-service',
      'product-1',
    );
    expect(publisher.publish).toHaveBeenNthCalledWith(
      2,
      'StockLow',
      expect.objectContaining({ productId: 'product-1', stockLevel: 2, reorderThreshold: 3 }),
      'inventory-service',
      'product-1',
    );
  });

  it('emits product-deleted events so reporting projections can remove stale products', async () => {
    const { service, prisma, publisher, search } = createService();
    prisma.product.findUnique.mockResolvedValue(makeProduct());
    prisma.product.delete.mockResolvedValue(makeProduct());

    await service.delete('product-1');

    expect(search.delete).toHaveBeenCalledWith('product-1');
    expect(publisher.publish).toHaveBeenCalledWith(
      'ProductDeleted',
      { productId: 'product-1', name: 'Scanner', category: 'Warehouse' },
      'inventory-service',
      'product-1',
    );
  });
});
