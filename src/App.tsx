import { useState, useCallback, useEffect } from 'react';
import { Layout, type Page } from '@/components/Layout';
import { ToastContainer } from '@/components/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { Customers } from '@/pages/Customers';
import { AddCustomer } from '@/pages/AddCustomer';
import { CustomerProfile } from '@/pages/CustomerProfile';
import { MedicineHistory } from '@/pages/MedicineHistory';
import { HealthCheckupList } from '@/pages/HealthCheckupList';
import { MembershipList } from '@/pages/MembershipList';
import { MonthlyView } from '@/pages/MonthlyView';
import { Reports } from '@/pages/Reports';
import { RegularCustomers } from '@/pages/RegularCustomers';
import { CheckupHistory } from '@/pages/CheckupHistory';
import { PendingCheckups } from '@/pages/PendingCheckups';
import { MedicinesDue } from '@/pages/MedicinesDue';
import { CustomerAuthProvider, useCustomerAuth } from '@/lib/customer-auth';
import { CustomerLayout, type CustomerPage } from '@/customer/CustomerLayout';
import { CustomerLogin } from '@/customer/CustomerLogin';
import { CustomerDashboard } from '@/customer/CustomerDashboard';
import { CustomerMembership } from '@/customer/CustomerMembership';
import { CustomerMedicines } from '@/customer/CustomerMedicines';
import { CustomerCheckups } from '@/customer/CustomerCheckups';
import { CustomerBp } from '@/customer/CustomerBp';
import { CustomerSugar } from '@/customer/CustomerSugar';
import { CustomerEcg } from '@/customer/CustomerEcg';
import { CustomerHistory } from '@/customer/CustomerHistory';
import { CustomerProfile as CustomerPortalProfile } from '@/customer/CustomerProfile';
import { CustomerChangePassword } from '@/customer/CustomerChangePassword';

// ===== Hash routing for customer portal =====
// Format: #/customer/login, #/customer/dashboard, #/customer/bp, etc.
// No hash or any other hash → admin panel

type Route = 'admin' | { customer: CustomerPage | 'customer-login' };

function parseHash(): Route {
  const hash = window.location.hash;
  if (!hash.startsWith('#/customer/')) return 'admin';
  const path = hash.slice('#/customer/'.length);
  const valid: CustomerPage[] = [
    'customer-dashboard', 'customer-membership', 'customer-medicines',
    'customer-checkups', 'customer-bp', 'customer-sugar', 'customer-ecg',
    'customer-history', 'customer-profile', 'customer-change-password',
  ];
  if (path === 'login') return { customer: 'customer-login' };
  const match = valid.find(v => v === `customer-${path}`);
  if (match) return { customer: match };
  return 'admin';
}

function customerPath(page: CustomerPage | 'customer-login'): string {
  if (page === 'customer-login') return '#/customer/login';
  return `#/customer/${page.replace('customer-', '')}`;
}

function AdminApp() {
  const [page, setPage] = useState<Page>('dashboard');
  const [params, setParams] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useCallback((p: Page, pms?: Record<string, string>) => {
    setPage(p);
    setParams(pms ?? {});
    if (p === 'customers' && pms?.query) setSearchQuery(pms.query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard navigate={navigate} onSearch={handleSearch} />;
      case 'customers':
        return <Customers navigate={navigate} initialQuery={searchQuery} />;
      case 'add-customer':
        return <AddCustomer navigate={navigate} />;
      case 'customer-profile':
        return params.id ? <CustomerProfile customerId={params.id} navigate={navigate} /> : <Customers navigate={navigate} />;
      case 'medicine':
        return <MedicineHistory navigate={navigate} />;
      case 'bp':
        return <HealthCheckupList type="bp" navigate={navigate} />;
      case 'sugar':
        return <HealthCheckupList type="sugar" navigate={navigate} />;
      case 'ecg':
        return <HealthCheckupList type="ecg" navigate={navigate} />;
      case 'membership-active':
        return <MembershipList filter="active" navigate={navigate} />;
      case 'membership-expired':
        return <MembershipList filter="expired" navigate={navigate} />;
      case 'membership-expiring':
        return <MembershipList filter="expiring" navigate={navigate} />;
      case 'monthly-view':
        return <MonthlyView navigate={navigate} />;
      case 'reports':
        return <Reports />;
      case 'regular-customers':
        return <RegularCustomers navigate={navigate} />;
      case 'checkup-history':
        return <CheckupHistory navigate={navigate} />;
      case 'pending-checkups':
        return <PendingCheckups navigate={navigate} />;
      case 'medicines-due':
        return <MedicinesDue navigate={navigate} />;
      default:
        return <Dashboard navigate={navigate} onSearch={handleSearch} />;
    }
  };

  return (
    <Layout page={page} navigate={navigate} onSearch={handleSearch}>
      {renderPage()}
      <ToastContainer />
    </Layout>
  );
}

function CustomerApp() {
  const { customerId, customer, loading, logout, portalData } = useCustomerAuth();
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateCustomer = useCallback((page: CustomerPage | 'customer-login') => {
    window.location.hash = customerPath(page);
  }, []);

  // Not logged in → show login page (unless already on login)
  if (route === 'admin') {
    // User navigated away from customer portal — show admin
    return <AdminApp />;
  }

  const customerPage = route.customer;

  // Login page is accessible without auth
  if (customerPage === 'customer-login') {
    if (customerId && !loading) {
      // Already logged in → redirect to dashboard
      navigateCustomer('customer-dashboard');
      return null;
    }
    return <CustomerLogin navigate={() => navigateCustomer('customer-dashboard')} />;
  }

  // All other customer pages require auth
  if (!customerId) {
    navigateCustomer('customer-login');
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pharmos-500" />
          <p className="mt-3 text-sm text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const page: CustomerPage = customerPage as CustomerPage;

  const handleLogout = async () => {
    await logout();
    navigateCustomer('customer-login');
  };

  const renderCustomerPage = () => {
    switch (page) {
      case 'customer-dashboard':
        return <CustomerDashboard navigate={navigateCustomer} />;
      case 'customer-membership':
        return <CustomerMembership />;
      case 'customer-medicines':
        return <CustomerMedicines />;
      case 'customer-checkups':
        return <CustomerCheckups navigate={navigateCustomer} />;
      case 'customer-bp':
        return <CustomerBp />;
      case 'customer-sugar':
        return <CustomerSugar />;
      case 'customer-ecg':
        return <CustomerEcg />;
      case 'customer-history':
        return <CustomerHistory />;
      case 'customer-profile':
        return <CustomerPortalProfile />;
      case 'customer-change-password':
        return <CustomerChangePassword />;
      default:
        return <CustomerDashboard navigate={navigateCustomer} />;
    }
  };

  const membershipId = portalData?.membership?.membership_id ?? customer?.name ?? '';

  return (
    <CustomerLayout
      page={page}
      navigate={navigateCustomer}
      customerName={customer?.name ?? 'Member'}
      membershipId={membershipId}
      onLogout={handleLogout}
    >
      {renderCustomerPage()}
    </CustomerLayout>
  );
}

function App() {
  const [isCustomerRoute, setIsCustomerRoute] = useState(() =>
    window.location.hash.startsWith('#/customer/')
  );

  useEffect(() => {
    const onHashChange = () => {
      setIsCustomerRoute(window.location.hash.startsWith('#/customer/'));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (isCustomerRoute) {
    return (
      <CustomerAuthProvider>
        <CustomerApp />
      </CustomerAuthProvider>
    );
  }

  return <AdminApp />;
}

export default App;
