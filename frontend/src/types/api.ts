export type Role = 'ADMIN' | 'STAFF';
export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SHIPPED';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'DECLINED' | 'REFUNDED';

export interface User {
  id?: string;
  sub?: string;
  username: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  stockLevel: number;
  reorderThreshold: number;
  imageUrl?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets?: {
    categories: Array<{ category: string; count: number }>;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  total: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  statusHistory?: Array<{
    id: string;
    status: OrderStatus;
    note?: string | null;
    createdAt: string;
  }>;
}

export interface OrderListResponse {
  orders: Order[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SalesReport {
  from: string;
  to: string;
  totalSales: number;
  orderCount: number;
  unitsSold: number;
  byDay: Array<{ date: string; totalSales: number; orderCount: number; unitsSold: number }>;
}

export interface InventoryReport {
  products: Array<{
    productId: string;
    name: string;
    category: string;
    stockLevel: number;
    reorderThreshold: number;
    lowStock: boolean;
    updatedAt: string;
  }>;
}

export interface StockAlertReport {
  alerts: Array<{
    id: string;
    productId: string;
    name: string;
    stockLevel: number;
    reorderThreshold: number;
    createdAt: string;
    resolvedAt: string | null;
  }>;
}
