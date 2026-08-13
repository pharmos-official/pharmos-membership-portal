import { type ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Pill,
  HeartPulse,
  CreditCard,
  BarChart3,
  Search,
  Menu,
  X,
  Plus,
  Stethoscope,
} from 'lucide-react';

export type Page =
  | 'dashboard'
  | 'customers'
  | 'add-customer'
  | 'customer-profile'
  | 'medicine'
  | 'bp'
  | 'sugar'
  | 'ecg'
  | 'membership-active'
  | 'membership-expired'
  | 'membership-expiring'
  | 'monthly-view'
  | 'reports'
  | 'regular-customers'
  | 'checkup-history'
  | 'pending-checkups'
  | 'medicines-due';

interface LayoutProps {
  page: Page;
  navigate: (page: Page, params?: Record<string, string>) => void;
  children: ReactNode;
  onSearch: (query: string) => void;
}

const navGroups: { label: string; items: { page: Page; label: string; icon: typeof Users }[] }[] = [
  {
    label: '',
    items: [{ page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Customers',
    items: [
      { page: 'customers', label: 'View Customers', icon: Users },
      { page: 'add-customer', label: 'Add New Customer', icon: Plus },
    ],
  },
  {
    label: 'Medicine & Health',
    items: [
      { page: 'medicine', label: 'Medicine History', icon: Pill },
      { page: 'bp', label: 'BP Checkup', icon: HeartPulse },
      { page: 'sugar', label: 'Sugar Checkup', icon: Stethoscope },
      { page: 'ecg', label: 'ECG Checkup', icon: HeartPulse },
    ],
  },
  {
    label: 'Membership',
    items: [
      { page: 'membership-active', label: 'Active Members', icon: CreditCard },
      { page: 'membership-expired', label: 'Expired Members', icon: CreditCard },
      { page: 'membership-expiring', label: 'Expiring Soon', icon: CreditCard },
      { page: 'monthly-view', label: 'Monthly Customer View', icon: BarChart3 },
    ],
  },
  {
    label: 'Insights',
    items: [{ page: 'reports', label: 'Reports', icon: BarChart3 }],
  },
];

export function Layout({ page, navigate, children, onSearch }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      navigate('customers');
    }
  };

  const isActive = (p: Page) => page === p || (p === 'customers' && page === 'customer-profile');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
              Health Membership
            </p>
          </div>
        </div>

        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
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
                  return (
                    <button
                      key={item.page}
                      onClick={() => navigate(item.page)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-pharmos-50 text-pharmos-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon size={18} className={active ? 'text-pharmos-600' : 'text-slate-400'} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-auto px-3 pt-6">
            <p className="text-[10px] text-slate-400">PHARMOS v1.0 — Customer Health System</p>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Mobile or Membership ID…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-pharmos-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pharmos-500/20"
            />
          </form>

          <button
            onClick={() => navigate('add-customer')}
            className="hidden items-center gap-2 rounded-lg bg-pharmos-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pharmos-600 sm:flex"
          >
            <Plus size={18} />
            New Member
          </button>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
