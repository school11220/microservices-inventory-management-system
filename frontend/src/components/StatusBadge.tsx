import type { OrderStatus } from '../types/api';

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-warningSoft text-warning',
  PROCESSING: 'bg-surface-container-high text-on-surface-variant',
  CONFIRMED: 'bg-successSoft text-success',
  FAILED: 'bg-dangerSoft text-danger',
  CANCELLED: 'bg-surface-container-high text-on-surface-variant',
  SHIPPED: 'bg-primarySoft text-primary',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-current/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
