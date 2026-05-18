export interface PricedOrderItem {
  quantity: number;
  unitPrice: number;
}

export function calculateLineTotal(item: PricedOrderItem): number {
  return Number((item.quantity * item.unitPrice).toFixed(2));
}

export function calculateOrderTotal(items: PricedOrderItem[]): number {
  return Number(items.reduce((sum, item) => sum + calculateLineTotal(item), 0).toFixed(2));
}
