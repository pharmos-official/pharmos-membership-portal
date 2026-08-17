import { useState } from 'react';
import { Pill, ArrowRight, AlertCircle, ShieldCheck, UserRound, MessageCircle, ArrowLeft } from 'lucide-react';
import { useCustomerAuth } from '@/lib/customer-auth';
import { useAdminAuth } from '@/lib/admin-auth';
import { useAppSettings, buildWhatsAppLink, usePrimePlans } from '@/lib/settings';

interface Props {
  navigate: (page: 'customer-dashboard') => void;
  onAdminLogin?: () => void;
}

type LoginMode = 'member' | 'admin';

export function CustomerLogin({ navigate, onAdminLogin }: Props) {
  const { login } = useCustomerAuth();
  const adminAuth = useAdminAuth();
  const { settings } = useAppSettings();
  const plans = usePrimePlans(settings);

  const [mode, setMode] = useState<LoginMode>('member');
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
    if (mode === 'member') {
      const result = await login(userId.trim(), password);
      setLoading(false);
      if (result.success) navigate('customer-dashboard');
      else setError(result.error || 'Login failed. Please check your User ID and Password.');
    } else {
      const result = await adminAuth.login(userId.trim(), password);
      setLoading(false);
      if (result.success) onAdminLogin?.();
      else setError(result.error || 'Login failed. Please check your User ID and Password.');
    }
  };

  const whatsAppLink = buildWhatsAppLink(settings, 'Hello! I would like to create a new Pharmos Membership account. Please guide me through the registration process.');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pharmos-500 to-pharmos-800 flex items-center justify-center px-4 py-8 relative">
      <a
        href="https://www.pharmos.in"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 left-4 flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        <span className="hidden sm:inline">Back to Pharmos</span>
        <span className="sm:hidden">Back</span>
      </a>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-gold-400/10" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Pill size={28} className="text-white" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-white">PHARMOS</h1>
          <p className="mt-1 text-sm text-pharmos-100">Membership Portal</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('member'); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all ${mode === 'member' ? 'bg-white text-pharmos-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UserRound size={16} /> Member / User
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all ${mode === 'admin' ? 'bg-white text-pharmos-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShieldCheck size={16} /> Admin
            </button>
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
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder={mode === 'member' ? 'Your mobile number or User ID' : 'Admin User ID'}
                className="input"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : 'Login'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-center text-sm text-slate-500">
              New to Pharmos?{' '}
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700">
                <MessageCircle size={15} /> Create New Account
              </a>
            </p>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Tap to chat with PHARMOS on WhatsApp and we'll set up your membership.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-4 text-center ring-1 ring-white/15 backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-wider text-pharmos-100">{plans.basic.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-white">₹{plans.basic.price}<span className="text-xs font-medium text-pharmos-100">/year</span></p>
            <p className="mt-0.5 text-[11px] text-pharmos-100">View health records</p>
          </div>
          <div className="rounded-xl bg-gold-400/15 p-4 text-center ring-1 ring-gold-400/30 backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gold-200">{plans.prime.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-white">₹{plans.prime.price}<span className="text-xs font-medium text-pharmos-100">/year</span></p>
            <p className="mt-0.5 text-[11px] text-pharmos-100">View + Upload documents</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-pharmos-100">
          Your health data is private and secure. Only you can see your records.
        </p>
      </div>
    </div>
  );
}