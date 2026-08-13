import { useEffect, useState } from 'react';
import { Pill, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import { formatDate, membershipStatus } from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

interface DueRow {
  id: string;
  name: string;
  mobile: string;
  membership_id: string;
  lastPurchase: string;
  lastMedicine: string;
  daysOfMedicine: number;
  dueDate: string;
  daysOverdue: number;
  membershipStatus: 'Active' | 'Expired';
}

export function MedicinesDue({ navigate }: Props) {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const { data } = await supabase
      .from('medicine_purchases')
      .select('id, customer_id, purchase_date, medicine_name, days_of_medicine, next_due_date, customers(id, name, mobile, memberships(membership_id, expiry_date))')
      .order('next_due_date', { ascending: true });

    const byCustomer = new Map<string, DueRow>();
    for (const p of data ?? []) {
      const cust = (p as any).customers;
      if (!cust) continue;
      if (byCustomer.has(cust.id)) continue;
      const dueDate = p.next_due_date;
      if (!dueDate || new Date(dueDate) > now) continue;
      const daysOverdue = Math.ceil((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const mem = cust.memberships?.[0];
      byCustomer.set(cust.id, {
        id: cust.id,
        name: cust.name,
        mobile: cust.mobile,
        membership_id: mem?.membership_id ?? '—',
        lastPurchase: p.purchase_date,
        lastMedicine: p.medicine_name,
        daysOfMedicine: p.days_of_medicine ?? 0,
        dueDate,
        daysOverdue,
        membershipStatus: mem ? membershipStatus(mem.expiry_date) : 'Expired',
      });
    }
    const sorted = Array.from(byCustomer.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
    setRows(sorted);
    setLoading(false);
  };

  const overdueColor = (days: number) => {
    if (days > 7) return 'badge-red';
    if (days > 3) return 'badge-gold';
    return 'badge-blue';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
          <Pill size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Customers Due for Medicines</h1>
          <p className="mt-0.5 text-sm text-slate-500">Customers whose next medicine purchase date has passed</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No customers are currently due for medicine purchases.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile</th>
                  <th className="px-4 py-3 text-left font-semibold">Member ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Purchase</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Medicine</th>
                  <th className="px-4 py-3 text-left font-semibold">Days of Medicine</th>
                  <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Days Overdue</th>
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
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.lastPurchase)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.lastMedicine}</td>
                    <td className="px-4 py-3 text-slate-600">{r.daysOfMedicine} days</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-semibold ${r.daysOverdue > 7 ? 'text-red-600' : r.daysOverdue > 3 ? 'text-gold-600' : 'text-pharmos-600'}`}>
                        {r.daysOverdue > 0 && <AlertCircle size={14} />}
                        {r.daysOverdue} day{r.daysOverdue !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={overdueColor(r.daysOverdue)}>{r.daysOverdue > 7 ? 'Overdue' : 'Due'}</span>
                    </td>
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
