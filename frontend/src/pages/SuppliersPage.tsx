import { AlertTriangle, Download, Mail, MoreVertical, Package, Plus, Star, Truck, Warehouse } from 'lucide-react';

const suppliers = [
  {
    id: 'SUP-IN-0014',
    name: 'Bharat Microcomponents',
    category: 'Electronics',
    contact: 'Ananya Rao',
    detail: 'ananya.rao@bharatmicro.in',
    score: '4.8',
    icon: Package,
    warning: false,
  },
  {
    id: 'SUP-IN-0082',
    name: 'Delhivery Fulfilment Services',
    category: 'Pan-India Logistics',
    contact: 'North Zone Desk',
    detail: '+91 80 4567 2834',
    score: '4.2',
    icon: Truck,
    warning: false,
  },
  {
    id: 'SUP-IN-0105',
    name: 'Udaipur Packwell Materials',
    category: 'Packaging',
    contact: 'Mehul Jain',
    detail: 'mehul@udaipurpackwell.in',
    score: '4.9',
    icon: Warehouse,
    warning: false,
  },
  {
    id: 'SUP-IN-0138',
    name: 'Jamshedpur Steel Works',
    category: 'Raw Materials',
    contact: 'Priya Menon',
    detail: 'vendor.relations@jsw-supply.in',
    score: '3.1',
    icon: AlertTriangle,
    warning: true,
  },
];

export function SuppliersPage() {
  return (
    <section className="grid min-w-0 gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">Supplier Network</h2>
          <p className="mt-1 text-on-surface-variant">Manage Indian supplier relationships, GST readiness, and regional fulfilment coverage.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high sm:flex-none">
            <Download size={18} />
            Export
          </button>
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primaryHover sm:flex-none">
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Warehouse} label="Total Active Suppliers" value="142" helper="+12 this quarter" tone="primary" />
        <SummaryCard icon={AlertTriangle} label="Pending Compliance" value="7" helper="Action required" tone="danger" />
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container p-5 shadow-panel transition hover:border-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Star size={18} />
              Top Performing
            </span>
            <span className="text-on-surface-variant">98/100</span>
          </div>
          <p className="relative mt-4 text-2xl font-semibold leading-tight text-on-surface">Bengaluru Warehousing Hub</p>
          <p className="relative mt-1 text-sm text-on-surface-variant">South India fulfilment leader</p>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-panel">
        <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-high p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Suppliers</h3>
            <p className="text-sm text-on-surface-variant">Showing 1 to 4 of 142 entries</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-highest">
            <Package size={17} />
            Columns
          </button>
        </div>

        <div className="app-scrollbar overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Supplier Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Primary Contact</th>
                <th className="px-6 py-4">Reliability Rating</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {suppliers.map((supplier) => {
                const Icon = supplier.icon;
                return (
                  <tr key={supplier.id} className="bg-surface-container transition hover:bg-surface-container-high">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-lg border ${supplier.warning ? 'border-danger/30 bg-danger/10 text-danger' : 'border-outline-variant bg-surface-variant text-on-surface-variant'}`}>
                          <Icon size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-on-surface">{supplier.name}</span>
                          <span className={supplier.warning ? 'text-xs font-semibold text-danger' : 'text-xs text-on-surface-variant'}>
                            {supplier.warning ? 'Compliance Review' : `ID: ${supplier.id}`}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-outline-variant bg-secondary-container/50 px-2.5 py-1 text-xs font-semibold text-on-surface">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-on-surface">{supplier.contact}</p>
                      <p className="mt-1 flex items-center gap-1 break-words text-xs text-on-surface-variant">
                        <Mail size={13} />
                        {supplier.detail}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 text-on-surface">
                        <span className="inline-flex text-primary">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} size={15} fill={index < Math.floor(Number(supplier.score)) ? 'currentColor' : 'none'} />
                          ))}
                        </span>
                        <span className="font-semibold">{supplier.score}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface" aria-label={`Open actions for ${supplier.name}`}>
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof Warehouse;
  label: string;
  value: string;
  helper: string;
  tone: 'primary' | 'danger';
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container p-5 shadow-panel">
      <div className="mb-4 flex items-center gap-2 text-on-surface-variant">
        <Icon className={tone === 'danger' ? 'text-danger' : 'text-primary'} size={20} />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className={tone === 'danger' ? 'text-3xl font-bold text-danger sm:text-4xl' : 'text-3xl font-bold text-on-surface sm:text-4xl'}>{value}</p>
      <p className={tone === 'danger' ? 'mt-2 text-sm text-on-surface-variant' : 'mt-2 text-sm text-primary'}>{helper}</p>
    </div>
  );
}
