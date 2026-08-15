import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, UserCheck, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/admin-auth';
import { showToast } from '@/components/Toast';
import { formatDate, membershipStatus, daysUntilExpiry, calcExpiry, toISODate } from '@/lib/helpers';
import type { Customer, Membership } from '@/types';

type Filter = 'expired' | 'active' | 'all';

interface RenewalRow extends Customer {
  membership: Membership | null;
}

export function AdminRenewals() {
  const { sessionToken } = useAdminAuth();
  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('expired');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RenewalRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, memberships(*)')
      .order('name', { ascending: true });
    const all = (data ?? []).map(c => ({
      ...c,
      membership: c.memberships?.[0] ?? null,
    })) as RenewalRow[];
    setRows(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    const st = membershipStatus(r.membership?.expiry_date ?? null);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'expired' ? st === 'Expired' :
      st === 'Active';
    if (!matchFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.mobile.toLowerCase().includes(q) ||
      (r.membership?.membership_id ?? '').toLowerCase().includes(q)
    );
  });

  const renewMembership = async (row: RenewalRow) => {
    if (!sessionToken || !row.membership || !editing) return;
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_membership', {
      p_admin_session_token: sessionToken,
      p_membership_id: row.membership.id,
      p_plan: editing.membership!.plan,
      p_status: 'active',
      p_prime_enabled: editing.membership!.prime_enabled,
      p_start_date: editing.membership!.start_date,
      p_expiry_date: editing.membership!.expiry_date,
    });
    setSaving(false);
    if (error) {
      showToast(`Failed to renew: ${error.message}`, 'error');
      return;
    }
    showToast(`${row.name}'s membership renewed successfully!`, 'success');
    setEditing(null);
    await load();
  };

  const openEdit = (row: RenewalRow) => {
    setEditing({
      ...JSON.parse(JSON.stringify(row)),
      membership: row.membership ? { ...row.membership } : null,
    });
  };

  const updateEdit = (field: string, value: string | boolean) => {
    if (!editing?.membership) return;
    setEditing({
      ...editing,
      membership: { ...editing.membership, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
          <RefreshCw size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Expiry & Renewal</h1>
          <p className="mt-0.5 text-sm text-slate-500">Renew memberships and manage expiry dates</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {(['expired', 'active', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                filter === f ? 'bg-pharmos-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'expired' ? 'Expired' : f === 'active' ? 'Active' : 'All'}
            </button>
          ))}
        </div>

        <form onSubmit={e => e.preventDefault()} className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, mobile, membership ID…"
            className="input pl-9"
          />
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No members found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(row => {
              const st = membershipStatus(row.membership?.expiry_date ?? null);
              const dleft = daysUntilExpiry(row.membership?.expiry_date ?? null);
              return (
                <div key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pharmos-100 text-sm font-bold text-pharmos-700">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.membership?.membership_id ?? 'No ID'} · {row.mobile}
                      </p>
                      {row.membership && (
                        <p className={`mt-0.5 text-[11px] font-medium ${st === 'Active' ? 'text-slate-400' : 'text-red-500'}`}>
                          {formatDate(row.membership.start_date)} — {formatDate(row.membership.expiry_date)}
                          {st === 'Active' && dleft <= 30 ? ` · ${dleft}d left` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${st === 'Active' ? 'badge-green' : 'badge-red'}`}>{st}</span>
                    <span className={`badge ${row.membership?.prime_enabled ? 'badge-gold' : 'badge-slate'}`}>
                      {row.membership?.prime_enabled ? 'Prime' : row.membership?.plan === 'prime' ? 'Prime' : 'Basic'}
                    </span>
                    <button onClick={() => openEdit(row)} className="btn-outline !px-3 !py-1.5 text-xs">
                      Manage / Renew
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing?.membership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-800">Manage Membership</h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{editing.name} · {editing.membership.membership_id}</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="label">Membership Plan</label>
                <select className="input" value={editing.membership.plan} onChange={e => updateEdit('plan', e.target.value)}>
                  <option value="basic">₹99 Basic</option>
                  <option value="prime">₹199 Pharmos Prime</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select className="input" value={editing.membership.status} onChange={e => updateEdit('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={editing.membership.prime_enabled}
                  onChange={e => updateEdit('prime_enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-pharmos-600 focus:ring-pharmos-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Pharmos Prime Enabled</p>
                  <p className="text-xs text-slate-400">Allows document upload & management</p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={editing.membership.start_date} onChange={e => updateEdit('start_date', e.target.value)} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input" value={editing.membership.expiry_date} onChange={e => updateEdit('expiry_date', e.target.value)} />
                </div>
              </div>

              {membershipStatus(editing.membership.expiry_date) === 'Expired' && (
                <button
                  type="button"
                  onClick={() => {
                    const start = toISODate(new Date());
                    updateEdit('start_date', start);
                    updateEdit('expiry_date', calcExpiry(start));
                    updateEdit('status', 'active');
                  }}
                  className="btn-outline w-full text-xs"
                >
                  Renew for 1 year from today
                </button>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setEditing(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => renewMembership(editing)} disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><RefreshCw size={16} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}