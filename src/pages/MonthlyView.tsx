import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, Membership, MedicinePurchase, BpRecord, SugarRecord, EcgRecord } from '@/types';
import { membershipStatus, customerStatus, checkupThisMonth, monthLabel } from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

interface MonthRow extends Customer {
  membership: Membership | null;
  purchases: MedicinePurchase[];
  bp: BpRecord[];
  sugar: SugarRecord[];
  ecg: EcgRecord[];
}

export function MonthlyView({ navigate }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [year, month]);

  const load = async () => {
    setLoading(true);
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data: customers } = await supabase
      .from('customers')
      .select('*, memberships(*)')
      .order('name', { ascending: true });

    if (!customers) { setLoading(false); return; }

    const enriched: MonthRow[] = [];
    for (const c of customers) {
      const [med, bp, sugar, ecg] = await Promise.all([
        supabase.from('medicine_purchases').select('*').eq('customer_id', c.id).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
        supabase.from('bp_records').select('*').eq('customer_id', c.id).gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
        supabase.from('sugar_records').select('*').eq('customer_id', c.id).gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
        supabase.from('ecg_records').select('*').eq('customer_id', c.id).gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      ]);
      enriched.push({
        ...c,
        membership: c.memberships?.[0] ?? null,
        purchases: (med.data ?? []) as MedicinePurchase[],
        bp: (bp.data ?? []) as BpRecord[],
        sugar: (sugar.data ?? []) as SugarRecord[],
        ecg: (ecg.data ?? []) as EcgRecord[],
      });
    }
    setRows(enriched);
    setLoading(false);
  };

  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Monthly Customer View</h1>
        <p className="mt-0.5 text-sm text-slate-500">View medicine purchases and checkup status for any month</p>
      </div>

      <div className="card flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="label">Month</label>
          <select className="input min-w-[140px]" value={month} onChange={e => setMonth(parseInt(e.target.value, 10))}>
            {months.map(m => (
              <option key={m} value={m}>{new Date(2000, m, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select className="input min-w-[100px]" value={year} onChange={e => setYear(parseInt(e.target.value, 10))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-pharmos-700">
          <CalendarDays size={18} /> {monthLabel(year, month)}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Member ID</th>
                  <th className="px-4 py-3 text-center font-semibold">Medicine</th>
                  <th className="px-4 py-3 text-center font-semibold">BP</th>
                  <th className="px-4 py-3 text-center font-semibold">Sugar</th>
                  <th className="px-4 py-3 text-center font-semibold">ECG</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => {
                  const st = customerStatus(r.membership, r.purchases);
                  const hasMed = r.purchases.length > 0;
                  const hasBp = r.bp.length > 0;
                  const hasSugar = r.sugar.length > 0;
                  const hasEcg = r.ecg.length > 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pharmos-100 text-xs font-bold text-pharmos-700">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.membership?.membership_id ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {hasMed ? <CheckCircle2 size={18} className="mx-auto text-emerald-600" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasBp ? <CheckCircle2 size={18} className="mx-auto text-emerald-600" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasSugar ? <CheckCircle2 size={18} className="mx-auto text-emerald-600" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasEcg ? <CheckCircle2 size={18} className="mx-auto text-emerald-600" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge-${st.tone}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate('customer-profile', { id: r.id })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
