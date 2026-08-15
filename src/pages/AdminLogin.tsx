import { useState } from 'react';
import { ShieldCheck, Lock, UserRound, ArrowRight, AlertCircle, Pill } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';

interface Props {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: Props) {
  const { login } = useAdminAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId.trim() || !password) {
      setError('Please enter your User ID and Password');
      return;
    }
    setLoading(true);
    const result = await login(userId.trim(), password);
    setLoading(false);
    if (result.success) onSuccess();
    else setError(result.error || 'Invalid User ID or password');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pharmos-500 shadow-lg">
            <Pill size={28} className="text-white" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-800">PHARMOS</h1>
          <p className="mt-1 text-sm text-slate-500">Admin Panel</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-pharmos-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-500">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-pharmos-800">Staff / Admin Login</p>
              <p className="text-xs text-pharmos-600">Access the PHARMOS management panel</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">User ID</label>
              <div className="relative">
                <UserRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Enter admin User ID" className="input pl-11" required autoFocus />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="input pl-11" required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : 'Login to Admin Panel'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[11px] text-slate-500">
              Default credentials: User ID <code className="font-mono font-semibold text-slate-700">admin</code> · Password <code className="font-mono font-semibold text-slate-700">admin123</code>
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Please change the password after first login.</p>
          </div>
        </div>
      </div>
    </div>
  );
}