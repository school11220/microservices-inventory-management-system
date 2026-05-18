import { Order, OrderItem, OrderStatusHistory } from '../../src/generated/prisma';

type OrderWithItems = Order & { items: OrderItem[]; statusHistory?: OrderStatusHistory[] };

export function toOrderResponse(order: OrderWithItems) {
  return {
    id: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerAddress: order.customerAddress,
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    failureReason: order.failureReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    statusHistory: (order.statusHistory ?? []).map((entry) => ({
      id: entry.id,
      status: entry.status,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
