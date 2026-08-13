import { User, Phone, MapPin, CreditCard, Calendar, BadgeCheck, AlertTriangle } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { useCustomerAuth } from '@/lib/customer-auth';
import { membershipStatus, formatDate } from '@/lib/helpers';

export function CustomerProfile() {
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
          <User size={20} className="text-pharmos-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your personal and membership information</p>
        </div>
      </div>

      {/* Avatar card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pharmos-100 font-display text-2xl font-bold text-pharmos-700">
            {customer?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-display text-lg font-bold text-slate-800">{customer?.name}</p>
            <p className="text-sm text-slate-500">{membership?.membership_id ?? 'No membership'}</p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
              {status === 'Active' ? <BadgeCheck size={12} /> : <AlertTriangle size={12} />}
              {status}
            </span>
          </div>
        </div>
      </div>

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

      <p className="text-center text-xs text-slate-400">For any changes to your profile or membership, please visit PHARMOS.</p>
    </div>
  );
}
