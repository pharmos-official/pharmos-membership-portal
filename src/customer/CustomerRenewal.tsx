import { AlertTriangle, RefreshCw, MessageCircle, Phone } from 'lucide-react';
import { useCustomerAuth } from '@/lib/customer-auth';
import { useAppSettings, buildWhatsAppLink } from '@/lib/settings';
import { formatDate } from '@/lib/helpers';
import type { CustomerPage } from '@/customer/CustomerLayout';

interface Props {
  navigate: (page: CustomerPage | 'customer-login') => void;
}

export function CustomerRenewal({ navigate }: Props) {
  const { customer, portalData, logout } = useCustomerAuth();
  const { settings } = useAppSettings();

  const membership = portalData?.membership ?? null;
  const whatsAppLink = buildWhatsAppLink(
    settings,
    `Hello! My membership has expired. I would like to renew my Pharmos membership. My membership ID is ${membership?.membership_id ?? ''}. Please assist me.`
  );

  const handleLogout = async () => {
    await logout();
    navigate('customer-login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={32} className="text-red-500" />
          </div>

          <h1 className="mt-5 font-display text-2xl font-bold text-slate-800">
            Please Renew Your Services
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Your membership has expired.
            <br />
            Please renew your membership to continue accessing your health records.
          </p>

          {membership && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Membership ID</span>
                <span className="font-semibold text-slate-800">{membership.membership_id}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-500">Member</span>
                <span className="font-semibold text-slate-800">{customer?.name}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-500">Expired On</span>
                <span className="font-semibold text-red-600">{formatDate(membership.expiry_date)}</span>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full"
            >
              <RefreshCw size={18} /> Renew Now
            </a>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full"
            >
              <MessageCircle size={18} /> Contact Admin
            </a>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            Your health records are safely stored and will be restored immediately after renewal.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="mx-auto mt-6 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600"
        >
          <Phone size={14} /> Logout
        </button>
      </div>
    </div>
  );
}