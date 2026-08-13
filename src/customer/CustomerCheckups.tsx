import { HeartPulse, Activity, Droplet, Stethoscope, ArrowRight, Check, X } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { useCustomerAuth } from '@/lib/customer-auth';
import { formatDate, checkupThisMonth, monthLabel } from '@/lib/helpers';
import type { CustomerPage } from '@/customer/CustomerLayout';

interface Props {
  navigate: (page: CustomerPage) => void;
}

export function CustomerCheckups({ navigate }: Props) {
  const { data, loading } = usePortalData();

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const { bp_records, sugar_records, ecg_records } = data;
  const now = new Date();

  const cards: { label: string; icon: typeof Activity; color: string; bg: string; count: number; page: CustomerPage; doneThisMonth: boolean }[] = [
    { label: 'Blood Pressure', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', count: bp_records.length, page: 'customer-bp', doneThisMonth: checkupThisMonth(bp_records, now.getFullYear(), now.getMonth()) },
    { label: 'Blood Sugar', icon: Droplet, color: 'text-gold-600', bg: 'bg-gold-50', count: sugar_records.length, page: 'customer-sugar', doneThisMonth: checkupThisMonth(sugar_records, now.getFullYear(), now.getMonth()) },
    { label: 'ECG', icon: Stethoscope, color: 'text-pharmos-600', bg: 'bg-pharmos-50', count: ecg_records.length, page: 'customer-ecg', doneThisMonth: checkupThisMonth(ecg_records, now.getFullYear(), now.getMonth()) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
          <HeartPulse size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">My Health Checkups</h1>
          <p className="mt-0.5 text-sm text-slate-500">View your BP, Sugar, and ECG records</p>
        </div>
      </div>

      {/* This month summary */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-slate-700">This Month — {monthLabel(now.getFullYear(), now.getMonth())}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {cards.map(c => (
            <div key={c.label} className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${c.doneThisMonth ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              {c.doneThisMonth
                ? <Check size={18} className="text-emerald-500" />
                : <X size={18} className="text-slate-300" />}
              <span className="text-xs font-semibold text-slate-700">{c.label}</span>
              <span className={`text-[11px] font-medium ${c.doneThisMonth ? 'text-emerald-600' : 'text-slate-400'}`}>
                {c.doneThisMonth ? 'Completed' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Checkup type cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => navigate(c.page)}
              className="stat-tile group text-left"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                  <Icon size={20} className={c.color} />
                </div>
                <ArrowRight size={16} className="text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-slate-800">{c.count}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">Only PHARMOS staff can add health checkup records. If you need a checkup, please visit PHARMOS.</p>
    </div>
  );
}
