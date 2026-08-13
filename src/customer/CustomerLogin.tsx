import { useState } from 'react';
import { Pill, LogIn, UserPlus, ArrowRight, AlertCircle } from 'lucide-react';
import { useCustomerAuth } from '@/lib/customer-auth';

interface Props {
  navigate: (page: 'customer-dashboard') => void;
}

export function CustomerLogin({ navigate }: Props) {
  const { login, activate } = useCustomerAuth();
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'activate' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    if (mode === 'login') {
      const result = await login(mobile.trim(), password);
      setLoading(false);
      if (result.success) {
        navigate('customer-dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } else {
      const result = await activate(mobile.trim(), membershipId.trim(), password);
      setLoading(false);
      if (result.success) {
        setSuccess('Account created successfully. Redirecting...');
        setTimeout(() => navigate('customer-dashboard'), 1000);
      } else {
        setError(result.error || 'Activation failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pharmos-500 to-pharmos-800 flex items-center justify-center px-4 py-8">
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
          <p className="mt-1 text-sm text-pharmos-100">Customer Health Portal</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-white text-pharmos-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn size={16} /> Login
            </button>
            <button
              onClick={() => { setMode('activate'); setError(''); setSuccess(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'activate' ? 'bg-white text-pharmos-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus size={16} /> Create Password
            </button>
          </div>

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Enter your registered mobile number"
                className="input"
                required
                autoFocus
              />
            </div>

            {mode === 'activate' && (
              <div>
                <label className="label">Membership ID</label>
                <input
                  type="text"
                  value={membershipId}
                  onChange={e => setMembershipId(e.target.value)}
                  placeholder="e.g. PHM000245"
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label className="label">{mode === 'activate' ? 'Create Password' : 'Password'}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'activate' ? 'Minimum 6 characters' : 'Enter your password'}
                className="input"
                required
              />
            </div>

            {mode === 'activate' && (
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="input"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-5 text-center text-sm text-slate-500">
              First time using Customer Panel?{' '}
              <button
                onClick={() => { setMode('activate'); setError(''); }}
                className="font-semibold text-pharmos-600 hover:text-pharmos-700"
              >
                Create Password
              </button>
            </p>
          )}
          {mode === 'activate' && (
            <p className="mt-5 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className="font-semibold text-pharmos-600 hover:text-pharmos-700"
              >
                Login here
              </button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-pharmos-100">
          Your health data is private and secure. Only you can see your records.
        </p>
      </div>
    </div>
  );
}
