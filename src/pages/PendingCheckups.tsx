import { useEffect, useState } from 'react';
import { Clock, ChevronRight, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, Membership } from '@/types';
import { membershipStatus, formatDate } from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

interface PendingRow {
  id: string;
  name: string;
  mobile: string;
  membership_id: string;
  membershipStatus: 'Active' | 'Expired';
  bpDone: boolean;
  sugarDone: boolean;
  ecgDone: boolean;
  lastCheckup: string | null;
}

export function PendingCheckups({ navigate }: Props) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [memberships, bpMonth, sugarMonth, ecgMonth, bpAll, sugarAll, ecgAll] = await Promise.all([
      supabase.from('memberships').select('id, customer_id, membership_id, expiry_date, customers(id, name, mobile)'),
      supabase.from('bp_records').select('customer_id, checkup_date').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('sugar_records').select('customer_id, checkup_date').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('ecg_records').select('customer_id, checkup_date').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('bp_records').select('customer_id, checkup_date').order('checkup_date', { ascending: false }),
      supabase.from('sugar_records').select('customer_id, checkup_date').order('checkup_date', { ascending: false }),
      supabase.from('ecg_records').select('customer_id, checkup_date').order('checkup_date', { ascending: false }),
    ]);

    const bpCust = new Set((bpMonth.data ?? []).map(r => r.customer_id));
    const sugarCust = new Set((sugarMonth.data ?? []).map(r => r.customer_id));
    const ecgCust = new Set((ecgMonth.data ?? []).map(r => r.customer_id));

    const lastCheckupMap = new Map<string, string>();
    for (const r of [...(bpAll.data ?? []), ...(sugarAll.data ?? []), ...(ecgAll.data ?? [])]) {
      const existing = lastCheckupMap.get(r.customer_id);
      if (!existing || r.checkup_date > existing) lastCheckupMap.set(r.customer_id, r.checkup_date);
    }

    const pending: PendingRow[] = [];
    for (const m of memberships.data ?? []) {
      const st = membershipStatus(m.expiry_date);
      if (st !== 'Active') continue;
      const cust = (m as any).customers as Customer | undefined;
      if (!cust) continue;
      const bpDone = bpCust.has(cust.id);
      const sugarDone = sugarCust.has(cust.id);
      const ecgDone = ecgCust.has(cust.id);
      if (!bpDone || !sugarDone || !ecgDone) {
        pending.push({
          id: cust.id,
          name: cust.name,
          mobile: cust.mobile,
          membership_id: m.membership_id,
          membershipStatus: st,
          bpDone,
          sugarDone,
          ecgDone,
          lastCheckup: lastCheckupMap.get(cust.id) ?? null,
        });
      }
    }
    pending.sort((a, b) => a.name.localeCompare(b.name));
    setRows(pending);
    setLoading(false);
  };

  const StatusIcon = ({ done }: { done: boolean }) => (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
      {done ? <Check size={14} /> : <X size={14} />}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
          <Clock size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Pending Monthly Checkups</h1>
          <p className="mt-0.5 text-sm text-slate-500">Active members who haven't completed all three checkups this month</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">All active members have completed their checkups this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile</th>
                  <th className="px-4 py-3 text-left font-semibold">Member ID</th>
                  <th className="px-4 py-3 text-center font-semibold">BP</th>
                  <th className="px-4 py-3 text-center font-semibold">Sugar</th>
                  <th className="px-4 py-3 text-center font-semibold">ECG</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Checkup</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pharmos-100 text-xs font-bold text-pharmos-700">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.mobile}</td>
                    <td className="px-4 py-3 text-slate-600">{r.membership_id}</td>
                    <td className="px-4 py-3 text-center"><StatusIcon done={r.bpDone} /></td>
                    <td className="px-4 py-3 text-center"><StatusIcon done={r.sugarDone} /></td>
                    <td className="px-4 py-3 text-center"><StatusIcon done={r.ecgDone} /></td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.lastCheckup)}</td>
                    <td className="px-4 py-3"><span className="badge-gold">Pending</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate('customer-profile', { id: r.id })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
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
