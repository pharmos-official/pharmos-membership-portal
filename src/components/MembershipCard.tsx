import { Pill, HeartPulse, ShieldCheck, FilePlus2, Eye } from 'lucide-react';
import type { Customer, Membership } from '@/types';
import { formatDateShort, membershipStatus, daysUntilExpiry } from '@/lib/helpers';

interface Props {
  customer: Customer;
  membership: Membership | null;
}

export function MembershipCard({ customer, membership }: Props) {
  const status = membershipStatus(membership?.expiry_date ?? null);
  const daysLeft = daysUntilExpiry(membership?.expiry_date ?? null);
  const expiringSoon = status === 'Active' && daysLeft <= 30;
  const isPrime = !!membership?.prime_enabled;
  const planLabel = isPrime ? 'Pharmos Prime' : 'Basic';
  const planPrice = isPrime ? '₹199/yr' : '₹99/yr';

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-card-hover"
      style={{
        background: 'linear-gradient(135deg, #006B8F 0%, #00374c 100%)',
      }}
    >
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-20 -right-4 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-gold-400/10" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
            <Pill size={22} className="text-white" />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">PHARMOS</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-pharmos-100">
              Health Membership Card
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20 backdrop-blur">
          <ShieldCheck size={14} />
          {status}
        </div>
      </div>

      <div className="relative mt-8">
        <p className="text-[10px] font-medium uppercase tracking-wider text-pharmos-100">Member ID</p>
        <p className="font-display text-2xl font-bold tracking-wider">{membership?.membership_id ?? '—'}</p>
      </div>

      <div className="relative mt-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-pharmos-100">Member Name</p>
          <p className="text-lg font-semibold">{customer.name}</p>
          <p className="mt-0.5 text-sm text-pharmos-100">{customer.mobile}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-pharmos-100">Valid Thru</p>
          <p className="text-sm font-semibold">{formatDateShort(membership?.expiry_date ?? null)}</p>
        </div>
      </div>

        <div className="relative mt-4 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            {isPrime ? <FilePlus2 size={14} className="text-gold-400" /> : <Eye size={14} className="text-pharmos-200" />}
            {planLabel}
          </div>
          <span className="text-[11px] font-medium text-pharmos-100">{planPrice}</span>
        </div>

        <div className="relative mt-4 flex items-center justify-between border-t border-white/15 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-pharmos-100">
            <HeartPulse size={14} className="text-gold-400" />
            <span>Free Monthly Health Checkup</span>
          </div>
          {expiringSoon && (
            <span className="rounded-full bg-gold-400 px-2.5 py-0.5 text-[10px] font-bold text-pharmos-900">
              Expires in {daysLeft}d
            </span>
          )}
        </div>
    </div>
  );
}
