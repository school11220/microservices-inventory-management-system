import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Badge, Lock, PackageCheck, ShieldCheck, User } from 'lucide-react';
import { authApi, extractApiError } from '../services/api';
import type { Role } from '../types/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('STAFF');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await authApi.register(username, password, role);
      navigate('/login');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-on-surface sm:p-8">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-elevated lg:grid-cols-[1fr_0.95fr]">
        <div className="auth-panel relative hidden min-h-[620px] flex-col justify-end p-8 text-white lg:flex">
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
          <div className="relative">
            <h1 className="text-3xl font-semibold text-on-surface">
              Microservices Inventory Management System
            </h1>
            <p className="mt-2 max-w-md text-lg leading-8 text-on-surface-variant">
              Enterprise-grade tools for scaling retail operations with confidence.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 sm:p-12 lg:p-16">
          <div className="mb-8">
            <div className="mb-5 flex min-w-0 items-center gap-2 text-primary">
              <PackageCheck size={30} />
              <span className="truncate text-xl font-bold sm:text-2xl">
                Microservices Inventory Management System
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Create your account
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Enter your details to join the Enterprise Suite.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-on-surface">
              Username
              <span className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                <input
                  required
                  minLength={3}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-10 pr-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="e.g. jsmith_admin"
                />
              </span>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-on-surface">
              Password
              <span className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-10 pr-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Minimum 8 characters"
                />
              </span>
            </label>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-on-surface">Assign Role</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleOption
                  role="ADMIN"
                  selected={role === 'ADMIN'}
                  onSelect={setRole}
                  icon={ShieldCheck}
                  label="Admin"
                />
                <RoleOption
                  role="STAFF"
                  selected={role === 'STAFF'}
                  onSelect={setRole}
                  icon={Badge}
                  label="Staff"
                />
              </div>
            </fieldset>

            {error && (
              <p className="rounded-lg bg-dangerSoft p-3 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <button
              disabled={saving}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-on-primary transition hover:bg-primaryHover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Registering...' : 'Register Account'}
              <ArrowRight size={18} />
            </button>
          </div>

          <p className="mt-8 border-t border-outline-variant pt-5 text-center text-sm text-on-surface-variant">
            Already have an account?{' '}
            <Link className="font-semibold text-primary underline" to="/login">
              Log in here
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

function RoleOption({
  role,
  selected,
  onSelect,
  icon: Icon,
  label,
}: {
  role: Role;
  selected: boolean;
  onSelect: (role: Role) => void;
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <label className="cursor-pointer">
      <input className="sr-only" type="radio" checked={selected} onChange={() => onSelect(role)} />
      <span
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-sm font-semibold transition ${
          selected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <Icon size={24} />
        {label}
      </span>
    </label>
  );
}
