import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CalendarDays, Download, DollarSign, ShoppingBasket } from 'lucide-react';
import { Toast } from '../components/Toast';
import { extractApiError, reportsApi } from '../services/api';
import type { InventoryReport, SalesReport, StockAlertReport } from '../types/api';
import { formatCurrency } from '../utils/currency';

export function ReportsPage() {
  const [sales, setSales] = useState<SalesReport>();
  const [inventory, setInventory] = useState<InventoryReport>();
  const [alerts, setAlerts] = useState<StockAlertReport>();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: 'error' }>();

  async function load() {
    setLoading(true);
    try {
      const [salesData, inventoryData, alertData] = await Promise.all([
        reportsApi.sales(),
        reportsApi.inventory(),
        reportsApi.stockAlerts(),
      ]);
      setSales(salesData);
      setInventory(inventoryData);
      setAlerts(alertData);
    } catch (error) {
      setToast({ message: extractApiError(error), tone: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const distribution = useMemo(() => {
    const products = inventory?.products ?? [];
    const lowStock = products.filter((product) => product.lowStock && product.stockLevel > 0).length;
    const outOfStock = products.filter((product) => product.stockLevel === 0).length;
    const inStock = Math.max(0, products.length - lowStock - outOfStock);
    return { inStock, lowStock, outOfStock, total: products.length };
  }, [inventory]);

  return (
    <section className="grid min-w-0 gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">Reports & Analytics</h2>
          <p className="mt-1 text-on-surface-variant">India-focused revenue, stock, and dispatch insights.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high sm:flex-none">
            <CalendarDays size={18} />
            Last 30 Days
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primaryHover sm:flex-none"
          >
            <Download size={18} />
            Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container p-12 text-center text-on-surface-variant shadow-panel">
          Generating analytics...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard icon={DollarSign} label="Total Sales" value={formatCurrency(sales?.totalSales ?? 0)} badge="+ live" />
            <KpiCard icon={ShoppingBasket} label="Order Count" value={String(sales?.orderCount ?? 0)} badge="Orders" />
            <KpiCard icon={Boxes} label="Active SKUs" value={String(inventory?.products.length ?? 0)} badge="Stable" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-panel">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold text-on-surface sm:text-2xl">Sales Over Time</h3>
                <div className="flex w-fit rounded-lg bg-surface p-1 text-sm font-semibold">
                  <span className="rounded-md bg-surface-container-high px-3 py-1 text-on-surface shadow-sm">Revenue</span>
                  <span className="px-3 py-1 text-on-surface-variant">Orders</span>
                </div>
              </div>
              <SalesChart days={sales?.byDay ?? []} />
            </section>

            <section className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-panel">
              <h3 className="text-xl font-semibold text-on-surface sm:text-2xl">Inventory Distribution</h3>
              <div className="mt-6 flex flex-col items-center gap-6">
                <DistributionChart distribution={distribution} />
                <div className="w-full space-y-3">
                  <LegendRow color="bg-primary" label="In Stock" value={`${distribution.inStock} products`} />
                  <LegendRow color="bg-danger" label="Low Stock" value={`${distribution.lowStock} products`} />
                  <LegendRow color="bg-slateLine" label="Out of Stock" value={`${distribution.outOfStock} products`} />
                </div>
              </div>
            </section>
          </div>

          <section className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <AlertTriangle className="text-danger" size={24} />
              <h3 className="text-xl font-semibold text-on-surface sm:text-2xl">Critical Low Stock Alerts</h3>
              <span className="rounded-full bg-dangerSoft px-3 py-1 text-xs font-bold uppercase tracking-wide text-danger">
                {alerts?.alerts.length ?? 0} Items Requiring Action
              </span>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-panel">
              <div className="app-scrollbar overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    <tr>
                      <th className="px-6 py-4">Product Detail</th>
                      <th className="px-6 py-4">Current Stock</th>
                      <th className="px-6 py-4">Min. Threshold</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slateLine">
                    {(alerts?.alerts ?? []).length === 0 ? (
                      <tr>
                        <td className="px-6 py-10 text-center text-on-surface-variant" colSpan={5}>
                          No low-stock alerts yet.
                        </td>
                      </tr>
                    ) : (
                      (alerts?.alerts ?? []).map((alert) => (
                        <tr key={alert.id} className="bg-surface-container transition hover:bg-surface-container-high">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded bg-danger/10 text-danger">
                                <AlertTriangle size={18} />
                              </div>
                              <div>
                                <p className="font-semibold text-on-surface">{alert.name}</p>
                                <p className="font-mono text-xs text-on-surface-variant">{alert.productId.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-danger">{alert.stockLevel} units</td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">{alert.reorderThreshold} units</td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">{new Date(alert.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-semibold text-primary">Reorder Now</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-panel">
            <h3 className="text-xl font-semibold text-on-surface sm:text-2xl">Inventory Levels</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(inventory?.products ?? []).map((product) => (
                <div key={product.productId} className="rounded-xl border border-outline-variant bg-surface p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-on-surface">{product.name}</p>
                    <span className="text-sm font-semibold text-on-surface-variant">{product.category}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className={product.lowStock ? 'h-full bg-danger' : 'h-full bg-primary'}
                      style={{ width: `${Math.min(100, (product.stockLevel / Math.max(product.reorderThreshold * 2, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-on-surface-variant">
                    {product.stockLevel} in stock · threshold {product.reorderThreshold}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(undefined)} />
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, badge }: { icon: typeof DollarSign; label: string; value: string; badge: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-panel">
      <div className="mb-5 flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon size={21} />
        </span>
        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary">{badge}</span>
      </div>
      <p className="text-sm font-semibold text-on-surface-variant">{label}</p>
      <p className="mt-1 break-words text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">{value}</p>
    </div>
  );
}

function SalesChart({ days }: { days: SalesReport['byDay'] }) {
  const maxSales = Math.max(1, ...days.map((day) => day.totalSales));
  const points = days.length
    ? days
        .map((day, index) => {
          const x = days.length === 1 ? 50 : (index / (days.length - 1)) * 100;
          const y = 90 - (day.totalSales / maxSales) * 72;
          return `${x},${y}`;
        })
        .join(' ')
    : '0,90 100,90';

  return (
    <div className="relative h-[320px] overflow-hidden rounded-lg border border-outline-variant bg-surface p-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]">
        <defs>
          <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#68DBA9" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#68DBA9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke="#68DBA9" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <polygon points={`0,100 ${points} 100,100`} fill="url(#sales-fill)" />
      </svg>
      <div className="absolute inset-x-4 bottom-4 flex justify-between text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
        {(days.length ? days : [{ date: 'No data', totalSales: 0, orderCount: 0, unitsSold: 0 }]).slice(0, 5).map((day) => (
          <span key={day.date}>{day.date.slice(5) || day.date}</span>
        ))}
      </div>
    </div>
  );
}

function DistributionChart({ distribution }: { distribution: { inStock: number; lowStock: number; outOfStock: number; total: number } }) {
  const optimal = distribution.total === 0 ? 0 : Math.round((distribution.inStock / distribution.total) * 100);
  const low = distribution.total === 0 ? 0 : Math.round((distribution.lowStock / distribution.total) * 100);

  return (
    <div className="relative grid h-48 w-48 place-items-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" fill="none" r="16" stroke="#303632" strokeWidth="4" />
        <circle cx="18" cy="18" fill="none" r="16" stroke="#68DBA9" strokeDasharray={`${optimal}, 100`} strokeWidth="4" />
        <circle cx="18" cy="18" fill="none" r="16" stroke="#FFB4AB" strokeDasharray={`${low}, 100`} strokeDashoffset={`-${optimal}`} strokeWidth="4" />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-on-surface">{optimal}%</p>
        <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Optimal</p>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-on-surface-variant">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}
