import { useEffect, useState } from 'react';
import { HeartPulse, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import { formatDate, formatTime } from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';
type TypeFilter = 'all' | 'bp' | 'sugar' | 'ecg';

interface UnifiedRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  membership_id: string;
  mobile: string;
  checkup_date: string;
  checkup_time: string;
  type: 'BP' | 'Sugar' | 'ECG';
  detail: string;
}

export function CheckupHistory({ navigate }: Props) {
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => { load(); }, [dateFilter, typeFilter]);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: string | null = null;
    if (dateFilter === 'today') startDate = now.toISOString().split('T')[0];
    else if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    const queries: Promise<any>[] = [];
    if (typeFilter === 'all' || typeFilter === 'bp') {
      let q = supabase.from('bp_records').select('id, customer_id, checkup_date, checkup_time, systolic, diastolic, pulse, customers(id, name, mobile, memberships(membership_id))');
      if (startDate) q = q.gte('checkup_date', startDate);
      queries.push(q.order('checkup_date', { ascending: false }).limit(200));
    }
    if (typeFilter === 'all' || typeFilter === 'sugar') {
      let q = supabase.from('sugar_records').select('id, customer_id, checkup_date, checkup_time, test_type, reading, unit, customers(id, name, mobile, memberships(membership_id))');
      if (startDate) q = q.gte('checkup_date', startDate);
      queries.push(q.order('checkup_date', { ascending: false }).limit(200));
    }
    if (typeFilter === 'all' || typeFilter === 'ecg') {
      let q = supabase.from('ecg_records').select('id, customer_id, checkup_date, checkup_time, result, customers(id, name, mobile, memberships(membership_id))');
      if (startDate) q = q.gte('checkup_date', startDate);
      queries.push(q.order('checkup_date', { ascending: false }).limit(200));
    }

    const results = await Promise.all(queries);
    const unified: UnifiedRecord[] = [];
    results.forEach((res, idx) => {
      for (const r of res.data ?? []) {
        const cust = r.customers;
        const base = {
          id: r.id,
          customer_id: cust?.id ?? r.customer_id,
          customer_name: cust?.name ?? 'Unknown',
          membership_id: cust?.memberships?.[0]?.membership_id ?? '—',
          mobile: cust?.mobile ?? '—',
          checkup_date: r.checkup_date,
          checkup_time: r.checkup_time,
        };
        if (idx === 0 || (typeFilter === 'bp')) {
          unified.push({ ...base, type: 'BP', detail: `${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · ${r.pulse} bpm` : ''}` });
        } else if (idx === 1 || (typeFilter === 'sugar')) {
          unified.push({ ...base, type: 'Sugar', detail: `${r.test_type}: ${r.reading} ${r.unit}` });
        } else {
          unified.push({ ...base, type: 'ECG', detail: r.result ?? 'ECG recorded' });
        }
      }
    });
    unified.sort((a, b) => b.checkup_date.localeCompare(a.checkup_date) || b.checkup_time.localeCompare(a.checkup_time));
    setRecords(unified);
    setLoading(false);
  };

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];
  const typeFilters: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'bp', label: 'BP' },
    { value: 'sugar', label: 'Sugar' },
    { value: 'ecg', label: 'ECG' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
          <HeartPulse size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Checkup History</h1>
          <p className="mt-0.5 text-sm text-slate-500">All health checkup records with filters</p>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Filter size={16} /> Period:
        </div>
        <div className="flex gap-1.5">
          {dateFilters.map(f => (
            <button key={f.value} onClick={() => setDateFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                dateFilter === f.value ? 'bg-pharmos-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-slate-600">
          Type:
        </div>
        <div className="flex gap-1.5">
          {typeFilters.map(f => (
            <button key={f.value} onClick={() => setTypeFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                typeFilter === f.value ? 'bg-pharmos-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No checkup records found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Member ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Time</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Reading / Result</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={`${r.type}-${r.id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.membership_id}</td>
                    <td className="px-4 py-3 text-slate-600">{r.mobile}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.checkup_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTime(r.checkup_time)}</td>
                    <td className="px-4 py-3">
                      <span className={r.type === 'BP' ? 'badge-red' : r.type === 'Sugar' ? 'badge-gold' : 'badge-blue'}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.detail}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate('customer-profile', { id: r.customer_id })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
