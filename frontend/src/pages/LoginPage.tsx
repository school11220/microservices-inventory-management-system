import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Info, Lock, PackageCheck, User } from 'lucide-react';
import { login } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store';
import { extractApiError } from '../services/api';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const authStatus = useAppSelector((state) => state.auth.status);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('ChangeMe123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (token && authStatus === 'authenticated') return <Navigate to="/products" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await dispatch(login({ username, password })).unwrap();
      navigate('/products');
    } catch (err) {
      setError(extractApiError(err));
    }
  }

  const loading = authStatus === 'loading';

  return (
    <main className="flex min-h-screen bg-background text-on-surface">
      <section className="auth-panel relative hidden w-5/12 min-w-[420px] overflow-hidden p-10 text-on-surface lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-primary/10" />
        <div className="relative z-10">
          <div className="mb-10 flex items-center gap-3">
            <PackageCheck size={34} />
            <h1 className="text-2xl font-bold tracking-tight">
              Microservices Inventory Management System
            </h1>
          </div>
          <h2 className="max-w-lg text-5xl font-bold leading-tight tracking-tight text-on-surface">
            Scale your enterprise logistics with precision.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-primaryFixed/90">
            The India-ready standard for real-time stock visibility, GST-aware orders, and regional
            warehouse reporting.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primaryFixed">
            Enterprise Suite
          </p>
          <div className="mt-3 flex gap-5 text-sm text-on-surface-variant">
            <span>Secure Gateway</span>
            <span>Role Based Access</span>
          </div>
        </div>
      </section>

      <section className="relative flex flex-1 items-center justify-center px-4 py-10 pt-24 sm:px-8 lg:pt-10">
        <div className="absolute left-6 top-6 flex items-center gap-3 lg:hidden">
          <PackageCheck className="text-primary" size={28} />
          <span className="max-w-[calc(100vw-5rem)] truncate text-lg font-bold text-primary sm:text-xl">
            Microservices Inventory Management System
          </span>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface">Sign In</h2>
            <p className="mt-2 text-on-surface-variant">
              Access your dashboard and manage operations.
            </p>
          </div>

          <div className="mb-8 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4">
            <Info className="mt-0.5 text-primary" size={18} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Test Credentials</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                User: <span className="font-semibold text-on-surface">admin</span> · Pass:{' '}
                <span className="font-semibold text-on-surface">ChangeMe123!</span>
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1.5 text-sm font-semibold text-on-surface-variant">
              Username
              <span className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                <input
                  required
                  minLength={3}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-high py-3 pl-10 pr-4 text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Enter your username"
                />
              </span>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-on-surface-variant">
              Password
              <span className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                <input
                  required
                  minLength={8}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-high py-3 pl-10 pr-12 text-on-surface outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline transition hover:text-on-surface-variant"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <label className="flex items-center gap-2 py-1 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                className="rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
              />
              Stay signed in for 30 days
            </label>

            {error && (
              <p className="rounded-lg bg-dangerSoft p-3 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-primary px-5 py-4 text-sm font-bold text-on-primary shadow-sm transition hover:bg-primaryHover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 border-t border-outline-variant pt-5 text-center text-sm">
            <p className="text-on-surface-variant">
              New to the platform?{' '}
              <Link to="/register" className="font-semibold text-primary underline">
                Create Account
              </Link>
            </p>
            <Link
              to="/public"
              className="mt-3 inline-flex items-center gap-2 font-semibold text-on-surface-variant transition hover:text-primary"
            >
              Public Demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
