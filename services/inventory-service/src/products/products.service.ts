import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../src/generated/prisma';
import { EventPublisherService } from '../common/event-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import { BulkStockDto } from './dto/bulk-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductSearchService } from './product-search.service';
import { isLowStock, toProductSummary } from './product.presenter';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: EventPublisherService,
    private readonly productSearch: ProductSearchService,
  ) {}

  async list(query: ProductQueryDto) {
    const searchResult = await this.productSearch.search(query);
    if (searchResult) {
      return searchResult;
    }

    const where: Prisma.ProductWhereInput = {
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [products, total, categoryFacets] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
      this.prisma.product.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
        orderBy: { category: 'asc' },
      }),
    ]);
    return {
      products: products.map(toProductSummary),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      facets: {
        categories: categoryFacets.map((facet) => ({
          category: facet.category,
          count: (facet._count as { category?: number } | undefined)?.category ?? 0,
        })),
      },
    };
  }

  async get(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return toProductSummary(product);
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        category: dto.category,
        stockLevel: dto.stockLevel,
        reorderThreshold: dto.reorderThreshold,
        imageUrl: dto.imageUrl,
      },
    });
    const summary = toProductSummary(product);
    await this.productSearch.index(summary);
    await this.publishStockAdjusted(summary, summary.stockLevel);
    if (isLowStock(summary.stockLevel, summary.reorderThreshold)) {
      await this.publishStockLow(summary);
    }
    return summary;
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.getExistingProduct(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        version: { increment: 1 },
      },
    });
    const summary = toProductSummary(product);
    await this.productSearch.index(summary);
    const projectionChanged =
      dto.name !== undefined ||
      dto.category !== undefined ||
      dto.stockLevel !== undefined ||
      dto.reorderThreshold !== undefined;
    if (projectionChanged) {
      await this.publishStockAdjusted(summary, summary.stockLevel - current.stockLevel);
      if (
        (dto.stockLevel !== undefined || dto.reorderThreshold !== undefined) &&
        isLowStock(summary.stockLevel, summary.reorderThreshold)
      ) {
        await this.publishStockLow(summary);
      }
    }
    return summary;
  }

  async delete(id: string) {
    const product = await this.getExistingProduct(id);
    await this.prisma.product.delete({ where: { id } });
    await this.productSearch.delete(id);
    await this.publisher.publish(
      'ProductDeleted',
      { productId: product.id, name: product.name, category: product.category },
      'inventory-service',
      product.id,
    );
  }

  async updateStock(id: string, dto: UpdateStockDto) {
    if (dto.delta === 0) {
      throw new BadRequestException('Stock delta cannot be zero');
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException('Product not found');
      }
      if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
        throw new ConflictException('Product version has changed');
      }
      const nextStock = current.stockLevel + dto.delta;
      if (nextStock < 0) {
        throw new BadRequestException('Stock cannot be negative');
      }
      const updated = await tx.product.updateMany({
        where: { id, version: current.version },
        data: { stockLevel: nextStock, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Concurrent stock update detected');
      }
      return tx.product.findUniqueOrThrow({ where: { id } });
    });

    const summary = toProductSummary(product);
    await this.productSearch.index(summary);
    await this.publishStockAdjusted(summary, dto.delta);
    if (isLowStock(summary.stockLevel, summary.reorderThreshold)) {
      await this.publishStockLow(summary);
    }
    return summary;
  }

  async bulkUpdateStock(dto: BulkStockDto) {
    const updated = [];
    for (const item of dto.items) {
      updated.push(await this.updateStock(item.productId, { delta: item.delta }));
    }
    return { updated };
  }

  async reindexSearch() {
    const products = await this.prisma.product.findMany({ orderBy: { updatedAt: 'desc' } });
    for (const product of products) {
      await this.productSearch.index(toProductSummary(product));
    }
    return { indexed: products.length, backendEnabled: this.productSearch.enabled };
  }

  private async getExistingProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async publishStockAdjusted(summary: ReturnType<typeof toProductSummary>, delta: number) {
    await this.publisher.publish(
      'StockAdjusted',
      {
        productId: summary.id,
        name: summary.name,
        category: summary.category,
        stockLevel: summary.stockLevel,
        reorderThreshold: summary.reorderThreshold,
        delta,
      },
      'inventory-service',
      summary.id,
    );
  }

  private async publishStockLow(summary: ReturnType<typeof toProductSummary>) {
    await this.publisher.publish(
      'StockLow',
      {
        productId: summary.id,
        name: summary.name,
        stockLevel: summary.stockLevel,
        reorderThreshold: summary.reorderThreshold,
      },
      'inventory-service',
      summary.id,
    );
  }
}
