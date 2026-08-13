import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  HeartPulse,
  AlertCircle,
  Pill,
  Clock,
  Search,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, Membership } from '@/types';
import { membershipStatus, daysUntilExpiry, formatDate } from '@/lib/helpers';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  regularCustomers: number;
  todayCheckups: number;
  pendingCheckups: number;
  customersDueMedicine: number;
  expiringSoon: number;
}

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
  onSearch: (query: string) => void;
}

export function Dashboard({ navigate, onSearch }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMembers, setRecentMembers] = useState<(Customer & { membership?: Membership })[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadStats();
    loadRecent();
  }, []);

  const loadStats = async () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [memberships, medPurchases, bpToday, sugarToday, ecgToday] = await Promise.all([
      supabase.from('memberships').select('id, customer_id, expiry_date'),
      supabase.from('medicine_purchases').select('customer_id, purchase_date, next_due_date'),
      supabase.from('bp_records').select('id, checkup_date').eq('checkup_date', todayStr),
      supabase.from('sugar_records').select('id, checkup_date').eq('checkup_date', todayStr),
      supabase.from('ecg_records').select('id, checkup_date').eq('checkup_date', todayStr),
    ]);

    const allMemberships = memberships.data ?? [];
    const allPurchases = medPurchases.data ?? [];

    let active = 0, expired = 0, expiring = 0;
    for (const m of allMemberships) {
      const st = membershipStatus(m.expiry_date);
      if (st === 'Active') {
        active++;
        const dleft = daysUntilExpiry(m.expiry_date);
        if (dleft <= 30) expiring++;
      } else {
        expired++;
      }
    }

    // Regular customers: purchased in >= 4 of last 6 months
    const purchasesByCustomer = new Map<string, Set<string>>();
    for (const p of allPurchases) {
      const d = new Date(p.purchase_date);
      if (d >= sixMonthsAgo) {
        if (!purchasesByCustomer.has(p.customer_id)) purchasesByCustomer.set(p.customer_id, new Set());
        purchasesByCustomer.get(p.customer_id)!.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
    }
    let regular = 0;
    for (const months of purchasesByCustomer.values()) {
      if (months.size >= 4) regular++;
    }

    // Customers due for medicine (next_due_date <= today)
    const dueSet = new Set<string>();
    for (const p of allPurchases) {
      if (p.next_due_date && new Date(p.next_due_date) <= now) {
        dueSet.add(p.customer_id);
      }
    }

    // Pending monthly checkups: active members who haven't had all 3 this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const [bpMonth, sugarMonth, ecgMonth] = await Promise.all([
      supabase.from('bp_records').select('customer_id').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('sugar_records').select('customer_id').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('ecg_records').select('customer_id').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
    ]);

    const bpCust = new Set((bpMonth.data ?? []).map(r => r.customer_id));
    const sugarCust = new Set((sugarMonth.data ?? []).map(r => r.customer_id));
    const ecgCust = new Set((ecgMonth.data ?? []).map(r => r.customer_id));
    let pending = 0;
    const activeCustIds = allMemberships.filter(m => membershipStatus(m.expiry_date) === 'Active').map(m => m.customer_id);
    for (const cid of activeCustIds) {
      if (!bpCust.has(cid) || !sugarCust.has(cid) || !ecgCust.has(cid)) pending++;
    }

    setStats({
      totalMembers: allMemberships.length,
      activeMembers: active,
      expiredMembers: expired,
      regularCustomers: regular,
      todayCheckups: (bpToday.data?.length ?? 0) + (sugarToday.data?.length ?? 0) + (ecgToday.data?.length ?? 0),
      pendingCheckups: pending,
      customersDueMedicine: dueSet.size,
      expiringSoon: expiring,
    });
    setLoading(false);
  };

  const loadRecent = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*, memberships(*)')
      .order('created_at', { ascending: false })
      .limit(5);
    const recent = (data ?? []).map(c => ({
      ...c,
      membership: c.memberships?.[0] ?? null,
    }));
    setRecentMembers(recent as (Customer & { membership?: Membership })[]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      navigate('customers');
    }
  };

  const tiles: { label: string; value: number; icon: typeof Users; color: string; bg: string; page?: Page }[] = [
    { label: 'Total Members', value: stats?.totalMembers ?? 0, icon: Users, color: 'text-pharmos-600', bg: 'bg-pharmos-50', page: 'customers' },
    { label: 'Active Members', value: stats?.activeMembers ?? 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', page: 'membership-active' },
    { label: 'Expired Members', value: stats?.expiredMembers ?? 0, icon: UserX, color: 'text-red-600', bg: 'bg-red-50', page: 'membership-expired' },
    { label: 'Regular Customers', value: stats?.regularCustomers ?? 0, icon: TrendingUp, color: 'text-gold-600', bg: 'bg-gold-50', page: 'regular-customers' },
    { label: "Today's Checkups", value: stats?.todayCheckups ?? 0, icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50', page: 'checkup-history' },
    { label: 'Pending Checkups', value: stats?.pendingCheckups ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', page: 'pending-checkups' },
    { label: 'Due for Medicine', value: stats?.customersDueMedicine ?? 0, icon: Pill, color: 'text-purple-600', bg: 'bg-purple-50', page: 'medicines-due' },
    { label: 'Expiring Soon', value: stats?.expiringSoon ?? 0, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', page: 'membership-expiring' },
  ];

  return (
    <div className="space-y-6">
      {/* Search hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pharmos-500 to-pharmos-800 p-6 text-white shadow-card lg:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-gold-400/10" />
        <div className="relative max-w-2xl">
          <h1 className="font-display text-2xl font-bold lg:text-3xl">Welcome to PHARMOS</h1>
          <p className="mt-1 text-sm text-pharmos-100">
            Search any customer by name, mobile number, or membership ID to access their complete health and medicine history.
          </p>
          <form onSubmit={handleSearch} className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by Name, Mobile or Membership ID…"
                className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <button type="submit" className="rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-bold text-pharmos-900 shadow-lg transition-colors hover:bg-gold-500">
              Search
            </button>
          </form>
          <button
            onClick={() => navigate('add-customer')}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-pharmos-100 hover:text-white"
          >
            <Plus size={16} /> Or register a new member
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <button
              key={i}
              onClick={() => tile.page && navigate(tile.page)}
              disabled={!tile.page}
              className={`stat-tile group text-left ${tile.page ? 'cursor-pointer hover:-translate-y-0.5 hover:border-pharmos-200' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.bg}`}>
                  <Icon size={20} className={tile.color} />
                </div>
                {tile.page && (
                  <ArrowRight size={16} className="text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                )}
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-slate-800 lg:text-3xl">
                {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-200" /> : tile.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{tile.label}</p>
            </button>
          );
        })}
      </div>

      {/* Recent members */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-800">Recently Added Members</h2>
          <button onClick={() => navigate('customers')} className="inline-flex items-center gap-1 text-sm font-semibold text-pharmos-600 hover:text-pharmos-700">
            View All <ArrowRight size={16} />
          </button>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {recentMembers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No members yet. Add your first customer to get started.</p>
          ) : (
            recentMembers.map(m => {
              const st = m.membership ? membershipStatus(m.membership.expiry_date) : 'Expired';
              return (
                <button
                  key={m.id}
                  onClick={() => navigate('customer-profile', { id: m.id })}
                  className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pharmos-100 text-sm font-bold text-pharmos-700">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.membership?.membership_id ?? '—'} · {m.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{formatDate(m.created_at)}</span>
                    <span className={`badge ${st === 'Active' ? 'badge-green' : 'badge-red'}`}>{st}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
