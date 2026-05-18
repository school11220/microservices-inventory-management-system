import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ProductSummary } from '@inventory/contracts';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventPublisherService } from '../common/event-publisher.service';
import { OrderStatus, PaymentStatus, Prisma } from '../../src/generated/prisma';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { calculateLineTotal, calculateOrderTotal } from './order.utils';
import { toOrderResponse } from './order.presenter';

@Injectable()
export class OrdersService {
  private readonly inventoryUrl = process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3002';

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: EventPublisherService,
  ) {}

  async create(dto: CreateOrderDto, request: Request) {
    const duplicates = new Set<string>();
    for (const item of dto.items) {
      if (duplicates.has(item.productId)) {
        throw new BadRequestException('Duplicate product IDs are not allowed in a single order');
      }
      duplicates.add(item.productId);
    }

    const products = await Promise.all(
      dto.items.map((item) => this.fetchProduct(item.productId, request)),
    );
    const items = dto.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} was not found`);
      }
      const lineTotal = calculateLineTotal({ quantity: item.quantity, unitPrice: product.price });
      return { input: item, product, lineTotal };
    });
    const total = calculateOrderTotal(
      items.map((item) => ({ quantity: item.input.quantity, unitPrice: item.product.price })),
    );
    const payment = this.simulatePayment();
    const initialStatus =
      payment.status === PaymentStatus.AUTHORIZED ? OrderStatus.PROCESSING : OrderStatus.FAILED;

    const order = await this.prisma.order.create({
      data: {
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerAddress: dto.customerAddress,
        total,
        status: initialStatus,
        paymentStatus: payment.status,
        paymentReference: payment.reference,
        failureReason: payment.failureReason,
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.input.quantity,
            unitPrice: item.product.price,
            lineTotal: item.lineTotal,
          })),
        },
        statusHistory: {
          create: {
            status: initialStatus,
            note:
              payment.status === PaymentStatus.AUTHORIZED
                ? `Payment authorized (${payment.reference}) and inventory reservation started`
                : payment.failureReason,
          },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });

    if (payment.status === PaymentStatus.DECLINED) {
      return toOrderResponse(order);
    }

    try {
      await this.publisher.publish(
        'OrderCreated',
        {
          orderId: order.id,
          total,
          customerInfo: {
            name: dto.customerName,
            email: dto.customerEmail,
            address: dto.customerAddress,
          },
          items: dto.items,
        },
        'order-service',
        order.id,
      );
    } catch {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.FAILED,
          failureReason: 'Event bus unavailable',
          statusHistory: {
            create: {
              status: OrderStatus.FAILED,
              note: 'Event bus unavailable',
            },
          },
        },
      });
      throw new ServiceUnavailableException('Order could not be submitted to inventory workflow');
    }

    return toOrderResponse(order);
  }

  async list(query: OrderQueryDto) {
    const where: Prisma.OrderWhereInput = query.status ? { status: query.status } : {};
    const skip = (query.page - 1) * query.limit;
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      orders: orders.map(toOrderResponse),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return toOrderResponse(order);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.get(id);
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        statusHistory: {
          create: {
            status: dto.status,
            note: 'Manual status update',
          },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return toOrderResponse(order);
  }

  async delete(id: string) {
    await this.get(id);
    await this.prisma.order.delete({ where: { id } });
  }

  private simulatePayment() {
    const mode = (process.env.PAYMENT_SIMULATION_MODE ?? 'success').toLowerCase();
    const reference = `PAY-${Date.now()}-${randomUUID().slice(0, 8)}`;
    if (mode === 'decline' || mode === 'failed') {
      return {
        status: PaymentStatus.DECLINED,
        reference,
        failureReason: 'Simulated payment declined',
      };
    }
    return { status: PaymentStatus.AUTHORIZED, reference, failureReason: null };
  }

  private async fetchProduct(id: string, request: Request): Promise<ProductSummary> {
    const response = await fetch(`${this.inventoryUrl}/products/${id}`, {
      headers: { authorization: request.headers.authorization ?? '' },
    }).catch((error: Error) => {
      throw new ServiceUnavailableException(`Inventory service unavailable: ${error.message}`);
    });
    if (response.status === 404) {
      throw new BadRequestException(`Product ${id} was not found`);
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`Inventory service returned ${response.status}`);
    }
    return (await response.json()) as ProductSummary;
  }
}
