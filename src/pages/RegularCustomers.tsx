import { useEffect, useState } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, Membership, MedicinePurchase } from '@/types';
import { membershipStatus, customerStatus, consistencyPercent, formatDate, lastPurchaseDate, nextExpectedPurchase } from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

interface Row extends Customer {
  membership: Membership | null;
  purchases: MedicinePurchase[];
}

export function RegularCustomers({ navigate }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, memberships(*), medicine_purchases(*)')
      .order('name', { ascending: true });

    const all = (data ?? []) as unknown as Row[];
    const filtered = all.filter(r => {
      const purchases = (r.medicine_purchases ?? []).sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
      const st = customerStatus(r.memberships?.[0] ?? null, purchases);
      return st.label === 'Regular Customer' || st.label === 'Monthly Customer';
    }).map(r => ({
      ...r,
      membership: r.memberships?.[0] ?? null,
      purchases: (r.medicine_purchases ?? []).sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)),
    }));
    setRows(filtered);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
          <TrendingUp size={20} className="text-gold-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Regular Monthly Customers</h1>
          <p className="mt-0.5 text-sm text-slate-500">Customers who purchase medicines consistently every month</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No regular customers found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile</th>
                  <th className="px-4 py-3 text-left font-semibold">Member ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Purchase</th>
                  <th className="px-4 py-3 text-left font-semibold">Next Due</th>
                  <th className="px-4 py-3 text-left font-semibold">Consistency</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => {
                  const st = customerStatus(r.membership, r.purchases);
                  const lastPurch = lastPurchaseDate(r.purchases);
                  const nextDue = nextExpectedPurchase(r.purchases);
                  const consistency = consistencyPercent(r.purchases);
                  const memSt = membershipStatus(r.membership?.expiry_date ?? null);
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
                      <td className="px-4 py-3 text-slate-600">{r.mobile}</td>
                      <td className="px-4 py-3 text-slate-600">{r.membership?.membership_id ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(lastPurch)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(nextDue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${consistency >= 75 ? 'bg-emerald-500' : consistency >= 50 ? 'bg-gold-400' : 'bg-slate-400'}`} style={{ width: `${consistency}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{consistency}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <span className={`badge-${st.tone}`}>{st.label}</span>
                          <span className={memSt === 'Active' ? 'badge-green' : 'badge-red'}>{memSt}</span>
                        </div>
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
