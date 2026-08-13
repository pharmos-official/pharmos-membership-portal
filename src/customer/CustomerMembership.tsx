import { CreditCard, User, Phone, MapPin, Calendar, BadgeCheck, AlertTriangle } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { useCustomerAuth } from '@/lib/customer-auth';
import { membershipStatus, formatDate } from '@/lib/helpers';

export function CustomerMembership() {
  const { data, loading } = usePortalData();
  const { customer } = useCustomerAuth();

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const { membership } = data;
  const status = membershipStatus(membership?.expiry_date ?? null);

  const infoRows: { label: string; value: string | null; icon: typeof User }[] = [
    { label: 'Name', value: customer?.name ?? null, icon: User },
    { label: 'Mobile Number', value: customer?.mobile ?? null, icon: Phone },
    { label: 'Address', value: customer?.address ?? null, icon: MapPin },
    { label: 'Membership ID', value: membership?.membership_id ?? null, icon: CreditCard },
    { label: 'Membership Start Date', value: membership ? formatDate(membership.start_date) : null, icon: Calendar },
    { label: 'Membership Expiry Date', value: membership ? formatDate(membership.expiry_date) : null, icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
          <CreditCard size={20} className="text-pharmos-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">My Membership</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your membership details and status</p>
        </div>
      </div>

      {/* Membership card */}
      {membership ? (
        <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-card ${status === 'Active' ? 'bg-gradient-to-br from-pharmos-500 to-pharmos-800' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">PHARMOS Health Membership</p>
              <p className="mt-2 font-display text-2xl font-bold">{membership.membership_id}</p>
              <p className="mt-1 text-sm text-white/80">{customer?.name}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status === 'Active' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
              {status === 'Active' ? <BadgeCheck size={14} /> : <AlertTriangle size={14} />}
              {status}
            </span>
          </div>
          <div className="relative mt-6 flex gap-8 text-sm">
            <div>
              <p className="text-xs text-white/60">Valid From</p>
              <p className="font-semibold">{formatDate(membership.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Valid Till</p>
              <p className="font-semibold">{formatDate(membership.expiry_date)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-500">No membership found. Please contact PHARMOS staff.</p>
        </div>
      )}

      {/* Detail rows */}
      <div className="card divide-y divide-slate-100">
        {infoRows.map(row => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-4 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Icon size={18} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{row.label}</p>
                <p className="text-sm font-semibold text-slate-800">{row.value || '—'}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">For any changes to your membership, please visit PHARMOS.</p>
    </div>
  );
}
