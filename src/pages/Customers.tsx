import { useEffect, useState } from 'react';
import { Search, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, Membership, MedicinePurchase, BpRecord, SugarRecord, EcgRecord } from '@/types';
import {
  membershipStatus,
  formatDate,
  lastPurchaseDate,
  nextExpectedPurchase,
  lastCheckupDate,
  customerStatus,
} from '@/lib/helpers';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  initialQuery?: string;
}

interface SearchRow extends Customer {
  memberships?: Membership[];
  medicine_purchases?: MedicinePurchase[];
  bp_records?: BpRecord[];
  sugar_records?: SugarRecord[];
  ecg_records?: EcgRecord[];
}

export function Customers({ navigate, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    } else {
      loadAll();
    }
  }, [initialQuery]);

  const loadAll = async () => {
    setLoading(true);
    setSearched(false);
    const { data } = await supabase
      .from('customers')
      .select('*, memberships(*), medicine_purchases(*), bp_records(*), sugar_records(*), ecg_records(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    setResults((data ?? []) as SearchRow[]);
    setLoading(false);
  };

  const performSearch = async (q: string) => {
    setLoading(true);
    setSearched(true);
    const trimmed = q.trim();
    if (!trimmed) {
      loadAll();
      return;
    }

    // Try membership ID match
    const upperQuery = trimmed.toUpperCase();
    const { data: byMembership } = await supabase
      .from('customers')
      .select('*, memberships(*), medicine_purchases(*), bp_records(*), sugar_records(*), ecg_records(*)')
      .ilike('memberships.membership_id', `%${upperQuery}%`);

    // Name or mobile
    const { data: byText } = await supabase
      .from('customers')
      .select('*, memberships(*), medicine_purchases(*), bp_records(*), sugar_records(*), ecg_records(*)')
      .or(`name.ilike.%${trimmed}%,mobile.ilike.%${trimmed}%`);

    // Merge and dedupe
    const map = new Map<string, SearchRow>();
    for (const row of [...(byMembership ?? []), ...(byText ?? [])]) {
      if (row && !map.has(row.id)) map.set(row.id, row as SearchRow);
    }
    setResults(Array.from(map.values()));
    setLoading(false);
  };

  const getRowData = (r: SearchRow) => {
    const membership = r.memberships?.[0] ?? null;
    const purchases = (r.medicine_purchases ?? []).sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
    const status = customerStatus(membership, purchases);
    const lastPurch = lastPurchaseDate(purchases);
    const nextDue = nextExpectedPurchase(purchases);
    const lastChk = lastCheckupDate(r.bp_records ?? [], r.sugar_records ?? [], r.ecg_records ?? []);
    const memStatus = membership ? membershipStatus(membership.expiry_date) : 'Expired';
    return { membership, status, lastPurch, nextDue, lastChk, memStatus };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Customers</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {searched ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` : 'All registered members'}
          </p>
        </div>
        <button onClick={() => navigate('add-customer')} className="btn-primary self-start sm:self-auto">
          <Plus size={18} /> Add New Member
        </button>
      </div>

      <form
        onSubmit={e => { e.preventDefault(); performSearch(query); }}
        className="card flex items-center gap-3 p-3"
      >
        <Search size={20} className="ml-2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by Name, Mobile Number or Membership ID…"
          className="flex-1 border-0 bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        <button type="submit" className="btn-primary">Search</button>
        {searched && (
          <button type="button" onClick={loadAll} className="btn-ghost">Clear</button>
        )}
      </form>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <AlertCircle size={28} className="text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">No customers found</p>
            <p className="mt-1 text-sm text-slate-400">
              {searched ? 'Try a different search term.' : 'Add your first customer to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map(r => {
              const { membership, status, lastPurch, nextDue, lastChk, memStatus } = getRowData(r);
              return (
                <button
                  key={r.id}
                  onClick={() => navigate('customer-profile', { id: r.id })}
                  className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-pharmos-100 text-sm font-bold text-pharmos-700">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-500">
                        {membership?.membership_id ?? 'No membership'} · {r.mobile}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:flex sm:items-center sm:gap-6">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Last Purchase</p>
                      <p className="text-xs font-semibold text-slate-700">{formatDate(lastPurch)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Next Expected</p>
                      <p className="text-xs font-semibold text-slate-700">{formatDate(nextDue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Last Checkup</p>
                      <p className="text-xs font-semibold text-slate-700">{formatDate(lastChk)}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                      <span className={`badge-${status.tone}`}>{status.label}</span>
                      <span className={memStatus === 'Active' ? 'badge-green' : 'badge-red'}>{memStatus}</span>
                    </div>
                    <ChevronRight size={18} className="hidden text-slate-300 sm:block" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
