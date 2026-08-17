import { type ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Pill,
  HeartPulse,
  History,
  User,
  Lock,
  LogOut,
  Menu,
  X,
  Activity,
  Droplet,
  Stethoscope,
  FilePlus2,
  BadgeCheck,
  ArrowLeft,
} from 'lucide-react';

export type CustomerPage =
  | 'customer-dashboard'
  | 'customer-membership'
  | 'customer-medicines'
  | 'customer-checkups'
  | 'customer-bp'
  | 'customer-sugar'
  | 'customer-ecg'
  | 'customer-history'
  | 'customer-profile'
  | 'customer-change-password'
  | 'customer-prime';

interface Props {
  page: CustomerPage;
  navigate: (page: CustomerPage) => void;
  customerName: string;
  membershipId: string;
  planLabel?: string;
  onLogout: () => void;
  children: ReactNode;
}

const navGroups: { label: string; items: { page: CustomerPage; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: '',
    items: [{ page: 'customer-dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'My Account',
    items: [
      { page: 'customer-membership', label: 'My Membership', icon: CreditCard },
      { page: 'customer-medicines', label: 'My Medicines', icon: Pill },
    ],
  },
  {
    label: 'My Checkups',
    items: [
      { page: 'customer-checkups', label: 'All Checkups', icon: HeartPulse },
      { page: 'customer-bp', label: 'Blood Pressure', icon: Activity },
      { page: 'customer-sugar', label: 'Blood Sugar', icon: Droplet },
      { page: 'customer-ecg', label: 'ECG', icon: Stethoscope },
    ],
  },
  {
    label: 'Pharmos Prime',
    items: [{ page: 'customer-prime', label: 'My Documents', icon: FilePlus2 }],
  },
  {
    label: 'More',
    items: [
      { page: 'customer-history', label: 'My History', icon: History },
      { page: 'customer-profile', label: 'My Profile', icon: User },
      { page: 'customer-change-password', label: 'Change Password', icon: Lock },
    ],
  },
];

export function CustomerLayout({ page, navigate, customerName, membershipId, planLabel, onLogout, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [page]);

  const isActive = (p: CustomerPage) => page === p;

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pharmos-500 shadow-sm">
            <Pill size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight text-slate-800">PHARMOS</p>
            <p className="-mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Customer Portal
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-xs font-semibold text-slate-700">{customerName}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">{membershipId}</p>
            {planLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold-700 ring-1 ring-gold-200">
                <BadgeCheck size={10} /> {planLabel}
              </span>
            )}
          </div>
        </div>

        <nav className="flex h-[calc(100vh-4rem-3rem)] flex-col overflow-y-auto px-3 py-4">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  const isPrime = item.page === 'customer-prime';
                  return (
                    <button
                      key={item.page}
                      onClick={() => navigate(item.page)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? isPrime ? 'bg-gold-50 text-gold-700' : 'bg-pharmos-50 text-pharmos-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon size={18} className={active ? (isPrime ? 'text-gold-600' : 'text-pharmos-600') : 'text-slate-400'} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-auto px-3 pt-6">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={18} className="text-red-500" />
              Logout
            </button>
            <p className="mt-3 text-[10px] text-slate-400">PHARMOS v1.0 — Customer Portal</p>
          </div>
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <a
            href="https://www.pharmos.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-pharmos-600 transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Pharmos</span>
            <span className="sm:hidden">Back</span>
          </a>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold text-slate-800">PHARMOS</p>
            <span className="badge-blue">Customer</span>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
