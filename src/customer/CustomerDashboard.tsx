import {
  CreditCard,
  Pill,
  Activity,
  Droplet,
  Stethoscope,
  CalendarClock,
  Check,
  X,
  ArrowRight,
  Eye,
  FilePlus2,
} from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { useCustomerAuth } from '@/lib/customer-auth';
import { membershipStatus, formatDate, monthLabel, checkupThisMonth, nextExpectedPurchase } from '@/lib/helpers';
import type { CustomerPage } from '@/customer/CustomerLayout';

interface Props {
  navigate: (page: CustomerPage) => void;
}

export function CustomerDashboard({ navigate }: Props) {
  const { data, loading } = usePortalData();
  const { customer } = useCustomerAuth();

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      </div>
    );
  }

  const { membership, medicine_purchases, bp_records, sugar_records, ecg_records, member_documents } = data;
  const memStatus = membershipStatus(membership?.expiry_date ?? null);
  const isPrime = !!membership?.prime_enabled;
  const planLabel = isPrime ? 'Pharmos Prime' : 'Pharmos Care';
  const now = new Date();
  const monthMeds = medicine_purchases.filter(p => {
    const d = new Date(p.purchase_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const bpDone = checkupThisMonth(bp_records, now.getFullYear(), now.getMonth());
  const sugarDone = checkupThisMonth(sugar_records, now.getFullYear(), now.getMonth());
  const ecgDone = checkupThisMonth(ecg_records, now.getFullYear(), now.getMonth());
  const nextDue = nextExpectedPurchase(medicine_purchases);
  const totalCheckups = bp_records.length + sugar_records.length + ecg_records.length;

  const tiles: { label: string; value: string; icon: typeof CreditCard; color: string; bg: string; page: CustomerPage }[] = [
    { label: 'My Membership', value: memStatus, icon: CreditCard, color: memStatus === 'Active' ? 'text-emerald-600' : 'text-red-600', bg: memStatus === 'Active' ? 'bg-emerald-50' : 'bg-red-50', page: 'customer-membership' },
    { label: 'My Medicines', value: String(medicine_purchases.length), icon: Pill, color: 'text-pharmos-600', bg: 'bg-pharmos-50', page: 'customer-medicines' },
    { label: "This Month's Medicines", value: String(monthMeds.length), icon: CalendarClock, color: 'text-gold-600', bg: 'bg-gold-50', page: 'customer-medicines' },
    { label: 'My Checkups', value: String(totalCheckups), icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', page: 'customer-checkups' },
    ...(isPrime ? [{ label: 'Prime Documents', value: String(member_documents.length), icon: FilePlus2, color: 'text-gold-600', bg: 'bg-gold-50', page: 'customer-prime' as CustomerPage }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pharmos-500 to-pharmos-800 p-6 text-white shadow-card lg:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-gold-400/10" />
        <div className="relative">
          <h1 className="font-display text-2xl font-bold lg:text-3xl">Welcome, {customer?.name ?? 'Member'}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-pharmos-100">Membership ID: </span>
              <span className="font-semibold">{membership?.membership_id ?? '—'}</span>
            </div>
            <div>
              <span className="text-pharmos-100">Status: </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${memStatus === 'Active' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
                {memStatus}
              </span>
            </div>
          </div>
          {membership && (
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <div><span className="text-pharmos-100">Start: </span><span className="font-semibold">{formatDate(membership.start_date)}</span></div>
              <div><span className="text-pharmos-100">Expiry: </span><span className="font-semibold">{formatDate(membership.expiry_date)}</span></div>
              <div>
                <span className="text-pharmos-100">Plan: </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${isPrime ? 'bg-gold-400/20 text-gold-100' : 'bg-white/15 text-white'}`}>
                  {isPrime ? <FilePlus2 size={12} /> : <Eye size={12} />}
                  {planLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Only notice for Pharmos Care members */}
      {!isPrime && (
        <div className="flex items-center gap-3 rounded-2xl border border-pharmos-200 bg-pharmos-50 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-pharmos-100">
            <Eye size={20} className="text-pharmos-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-pharmos-800">View Only — Your records are managed by Pharmos.</p>
            <p className="text-xs text-pharmos-600">
              Upgrade to Pharmos Prime to upload and manage your own health documents.
            </p>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(tile.page)}
              className="stat-tile group text-left"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.bg}`}>
                  <Icon size={20} className={tile.color} />
                </div>
                <ArrowRight size={16} className="text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-slate-800">{tile.value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{tile.label}</p>
            </button>
          );
        })}
      </div>

      {/* Next medicine due */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-slate-800">Next Medicine Due</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-50">
            <CalendarClock size={24} className="text-gold-600" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-slate-800">{nextDue ? formatDate(nextDue) : 'No upcoming due date'}</p>
            <p className="text-sm text-slate-500">
              {nextDue
                ? new Date(nextDue) > new Date()
                  ? 'Upcoming medicine purchase'
                  : 'Overdue — please visit PHARMOS'
                : 'No medicine history yet'}
            </p>
          </div>
        </div>
      </div>

      {/* This month's checkup status */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-800">This Month's Checkup — {monthLabel(now.getFullYear(), now.getMonth())}</h2>
          <button onClick={() => navigate('customer-checkups')} className="text-sm font-semibold text-pharmos-600 hover:text-pharmos-700">
            View All
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CheckupStatusCard label="Blood Pressure" icon={Activity} done={bpDone} onClick={() => navigate('customer-bp')} />
          <CheckupStatusCard label="Blood Sugar" icon={Droplet} done={sugarDone} onClick={() => navigate('customer-sugar')} />
          <CheckupStatusCard label="ECG" icon={Stethoscope} done={ecgDone} onClick={() => navigate('customer-ecg')} />
        </div>
      </div>
    </div>
  );
}

function CheckupStatusCard({ label, icon: Icon, done, onClick }: { label: string; icon: typeof Activity; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-card-hover ${
        done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className={`text-xs font-medium ${done ? 'text-emerald-600' : 'text-slate-500'}`}>
          {done ? 'Completed This Month' : 'Pending This Month'}
        </p>
      </div>
      {done ? <Check size={18} className="text-emerald-500" /> : <X size={18} className="text-slate-300" />}
    </button>
  );
}
