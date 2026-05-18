import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

interface ToastProps {
  message?: string;
  tone?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, tone = 'info', onClose }: ToastProps) {
  if (!message) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      className: 'border-success/25 bg-surface-container-highest text-success',
      progress: 'bg-success',
    },
    error: {
      icon: XCircle,
      className: 'border-danger/25 bg-surface-container-highest text-danger',
      progress: 'bg-danger',
    },
    info: {
      icon: Info,
      className: 'border-primary/25 bg-surface-container-highest text-primary',
      progress: 'bg-primary',
    },
  }[tone];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`fixed bottom-5 right-5 z-[80] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-elevated ${config.className}`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className="mt-0.5 shrink-0" size={20} />
        <p className="flex-1 text-sm font-semibold text-on-surface">{message}</p>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-on-surface-variant transition hover:bg-surface-container-high" aria-label="Dismiss notification">
          <X size={16} />
        </button>
      </div>
      <div className={`h-1 ${config.progress}`} />
    </div>
  );
}
