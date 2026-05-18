import { FormEvent, useEffect, useState } from 'react';
import { Box, Image, Save, UploadCloud, X } from 'lucide-react';
import type { Product } from '../types/api';

interface ProductFormProps {
  product?: Product | null;
  onCancel: () => void;
  onSubmit: (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<void>;
}

const empty = {
  name: '',
  description: '',
  category: '',
  price: 0,
  stockLevel: 0,
  reorderThreshold: 10,
  imageUrl: '',
};

export function ProductForm({ product, onCancel, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      product
        ? {
            name: product.name,
            description: product.description ?? '',
            category: product.category,
            price: product.price,
            stockLevel: product.stockLevel,
            reorderThreshold: product.reorderThreshold,
            imageUrl: product.imageUrl ?? '',
          }
        : empty,
    );
  }, [product]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        imageUrl: form.imageUrl || undefined,
        description: form.description || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <form onSubmit={submit} className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-elevated ring-1 ring-white/5">
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-high px-5 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Box size={22} />
            </span>
            <div className="min-w-0">
              <h2 id="product-form-title" className="text-xl font-semibold tracking-tight text-on-surface sm:text-2xl">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">Create or update an entry in the primary catalog.</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface hover:text-on-surface" aria-label="Close product form">
            <X size={20} />
          </button>
        </header>

        <div className="app-scrollbar grid gap-8 overflow-y-auto p-5 sm:p-8">
          <section className="grid gap-6 md:grid-cols-12">
            <div className="grid gap-2 md:col-span-4">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Product Image</span>
              <label className="group flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant bg-surface text-center transition hover:border-primary hover:bg-surface-container-highest">
                <input
                  className="sr-only"
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                />
                <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-container text-on-surface-variant transition group-hover:scale-105 group-hover:text-primary">
                  {form.imageUrl ? <Image size={22} /> : <UploadCloud size={22} />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-on-surface">{form.imageUrl ? 'Image URL attached' : 'Paste image URL'}</span>
                  <span className="mt-1 block text-xs text-on-surface-variant">Click and enter a hosted product image</span>
                </span>
              </label>
              <input
                value={form.imageUrl}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="https://..."
                type="url"
              />
            </div>

            <div className="grid gap-6 md:col-span-8">
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                Product Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="e.g. Industrial Steel Bolt"
                />
              </label>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Category
                  <input
                    required
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Electronics"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Price
                  <span className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">₹</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
                      className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-8 pr-4 text-base font-normal normal-case tracking-normal text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </span>
                </label>
              </div>
            </div>
          </section>

          <div className="h-px bg-outline-variant/60" />

          <section className="grid gap-6 md:grid-cols-3">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Current Stock
              <input
                required
                type="number"
                min="0"
                value={form.stockLevel}
                onChange={(event) => setForm({ ...form, stockLevel: Number(event.target.value) })}
                className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Reorder Threshold
              <input
                required
                type="number"
                min="0"
                value={form.reorderThreshold}
                onChange={(event) => setForm({ ...form, reorderThreshold: Number(event.target.value) })}
                className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Catalog State
              <input
                readOnly
                required
                value={form.stockLevel === 0 ? 'Out of stock' : form.stockLevel < form.reorderThreshold ? 'Low stock' : 'In stock'}
                className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-on-surface outline-none"
              />
            </label>
          </section>

          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="min-h-28 resize-none rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base font-normal normal-case tracking-normal text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="Describe the item specifications, dimensions, or use cases..."
            />
          </label>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-outline-variant bg-surface-container-high px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onCancel} className="rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest">
            Cancel
          </button>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60">
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </footer>
      </form>
    </div>
  );
}
