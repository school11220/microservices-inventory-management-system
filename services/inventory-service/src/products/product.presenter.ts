import { Product } from '../../src/generated/prisma';
import type { ProductSummary } from '@inventory/contracts';

export function toProductSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: Number(product.price),
    stockLevel: product.stockLevel,
    reorderThreshold: product.reorderThreshold,
    imageUrl: product.imageUrl,
    version: product.version,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function isLowStock(stockLevel: number, reorderThreshold: number): boolean {
  return stockLevel < reorderThreshold;
}
