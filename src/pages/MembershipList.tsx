import { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, UserX, UserCheck, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, Membership } from '@/types';
import { membershipStatus, daysUntilExpiry, formatDate } from '@/lib/helpers';

type FilterType = 'active' | 'expired' | 'expiring';

interface Props {
  filter: FilterType;
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export function MembershipList({ filter, navigate }: Props) {
  const [members, setMembers] = useState<(Customer & { membership: Membership })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, memberships(*)')
      .order('name', { ascending: true });

    const all = (data ?? []).map(c => ({
      ...c,
      membership: c.memberships?.[0] ?? null,
    })) as (Customer & { membership: Membership })[];

    const now = new Date();
    const filtered = all.filter(m => {
      if (!m.membership) return filter === 'expired';
      const st = membershipStatus(m.membership.expiry_date);
      const dleft = daysUntilExpiry(m.membership.expiry_date);
      if (filter === 'active') return st === 'Active' && dleft > 30;
      if (filter === 'expired') return st === 'Expired';
      if (filter === 'expiring') return st === 'Active' && dleft <= 30;
      return false;
    });
    setMembers(filtered);
    setLoading(false);
  };

  const titles: Record<FilterType, { title: string; subtitle: string; icon: typeof UserCheck; color: string }> = {
    active: { title: 'Active Members', subtitle: 'Members with active memberships', icon: UserCheck, color: 'text-emerald-600' },
    expired: { title: 'Expired Members', subtitle: 'Members whose membership has expired', icon: UserX, color: 'text-red-600' },
    expiring: { title: 'Expiring Soon', subtitle: 'Memberships expiring within 30 days', icon: AlertCircle, color: 'text-gold-600' },
  };

  const meta = titles[filter];
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
          <Icon size={20} className={meta.color} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{meta.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{meta.subtitle}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <CreditCard size={32} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No members in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map(m => {
              const st = membershipStatus(m.membership?.expiry_date ?? null);
              const dleft = daysUntilExpiry(m.membership?.expiry_date ?? null);
              return (
                <button
                  key={m.id}
                  onClick={() => navigate('customer-profile', { id: m.id })}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pharmos-100 text-sm font-bold text-pharmos-700">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.membership?.membership_id ?? 'No ID'} · {m.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-slate-400">Valid: {formatDate(m.membership?.start_date ?? null)} — {formatDate(m.membership?.expiry_date ?? null)}</p>
                      {filter === 'expiring' && (
                        <p className="text-xs font-semibold text-gold-600">Expires in {dleft} days</p>
                      )}
                    </div>
                    <span className={st === 'Active' ? 'badge-green' : 'badge-red'}>{st}</span>
                    <ChevronRight size={18} className="text-slate-300" />
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
