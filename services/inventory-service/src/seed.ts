import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const demoProducts = [
  {
    name: 'Bluetooth Barcode Scanner',
    description: 'Handheld scanner for warehouse receiving and dispatch counters.',
    category: 'Warehouse Equipment',
    price: 2499,
    stockLevel: 18,
    reorderThreshold: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Thermal Label Printer',
    description: 'Compact printer for shipping labels, bin tags, and inventory stickers.',
    category: 'Fulfillment',
    price: 6999,
    stockLevel: 8,
    reorderThreshold: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Smart Shelf Sensor',
    description: 'IoT shelf sensor for stock visibility and low-inventory monitoring.',
    category: 'IoT Inventory',
    price: 1899,
    stockLevel: 3,
    reorderThreshold: 6,
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Warehouse Tablet',
    description: 'Rugged Android tablet for staff picking, cycle counts, and order status updates.',
    category: 'Operations',
    price: 14999,
    stockLevel: 12,
    reorderThreshold: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=80',
  },
];

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function publishSeedProjection(product: Awaited<ReturnType<typeof upsertProduct>>) {
  const eventBusUrl = process.env.EVENT_BUS_URL;
  if (!eventBusUrl) return;

  const payload = {
    productId: product.id,
    name: product.name,
    category: product.category,
    stockLevel: product.stockLevel,
    reorderThreshold: product.reorderThreshold,
    delta: product.stockLevel,
  };

  await publishEvent(`seed-stock-adjusted-${slug(product.name)}`, 'StockAdjusted', payload);

  if (product.stockLevel < product.reorderThreshold) {
    await publishEvent(`seed-stock-low-${slug(product.name)}`, 'StockLow', {
      productId: product.id,
      name: product.name,
      stockLevel: product.stockLevel,
      reorderThreshold: product.reorderThreshold,
    });
  }
}

async function publishEvent(eventId: string, type: string, payload: unknown) {
  try {
    await fetch(`${process.env.EVENT_BUS_URL}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.INTERNAL_EVENT_TOKEN
          ? { 'x-event-token': process.env.INTERNAL_EVENT_TOKEN }
          : {}),
      },
      body: JSON.stringify({
        eventId,
        type,
        payload,
        source: 'inventory-service',
        correlationId: 'seed-demo-catalog',
      }),
    });
  } catch (error) {
    console.warn(
      `Seed projection publish skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function upsertProduct(product: (typeof demoProducts)[number]) {
  const existing = await prisma.product.findFirst({ where: { name: product.name } });
  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: product,
    });
  }
  return prisma.product.create({ data: product });
}

async function main() {
  for (const product of demoProducts) {
    const saved = await upsertProduct(product);
    await publishSeedProjection(saved);
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
