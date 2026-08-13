import { useEffect, useState } from 'react';
import { Pill, ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, MedicinePurchase } from '@/types';
import { formatDate, customerStatus } from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export function MedicineHistory({ navigate }: Props) {
  const [records, setRecords] = useState<(MedicinePurchase & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('medicine_purchases')
      .select('*, customers(*)')
      .order('purchase_date', { ascending: false })
      .limit(200);
    setRecords((data ?? []) as (MedicinePurchase & { customer?: Customer })[]);
    setLoading(false);
  };

  const filtered = records.filter(r => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.medicine_name.toLowerCase().includes(q) ||
      r.customer?.name.toLowerCase().includes(q) ||
      r.membership_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Medicine History</h1>
        <p className="mt-0.5 text-sm text-slate-500">All medicine purchase records across customers</p>
      </div>

      <div className="card flex items-center gap-3 p-3">
        <Search size={20} className="ml-2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by medicine name, customer, or membership ID…"
          className="flex-1 border-0 bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Pill size={32} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No medicine purchases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Member ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Medicine</th>
                  <th className="px-4 py-3 text-left font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Days</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Next Due</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.customer?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.membership_id}</td>
                    <td className="px-4 py-3 text-slate-700">{r.medicine_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.quantity} {r.unit}</td>
                    <td className="px-4 py-3 text-slate-600">{r.days_of_medicine}d</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.purchase_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.next_due_date)}</td>
                    <td className="px-4 py-3">
                      {r.customer && (
                        <button onClick={() => navigate('customer-profile', { id: r.customer!.id })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                          <ChevronRight size={18} />
                        </button>
                      )}
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
