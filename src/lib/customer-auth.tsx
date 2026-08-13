import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Customer, CustomerPortalData } from '@/types';

interface SessionInfo {
  customerId: string;
  sessionToken: string;
  customerName: string;
}

interface CustomerAuthState {
  customerId: string | null;
  customer: Customer | null;
  sessionToken: string | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<{ success: boolean; error?: string }>;
  activate: (mobile: string, membershipId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshCustomer: () => Promise<void>;
  portalData: CustomerPortalData | null;
  loadPortalData: () => Promise<CustomerPortalData | null>;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

const STORAGE_KEY = 'pharmos_customer_session';

function loadSession(): SessionInfo | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.customerId && parsed.sessionToken) {
      return parsed as SessionInfo;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [portalData, setPortalData] = useState<CustomerPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setCustomerId(session.customerId);
      setSessionToken(session.sessionToken);
    } else {
      setLoading(false);
    }
  }, []);

  const refreshCustomer = useCallback(async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();
    if (data) setCustomer(data as Customer);
  }, [customerId]);

  const loadPortalData = useCallback(async (): Promise<CustomerPortalData | null> => {
    if (!customerId || !sessionToken) return null;
    const { data, error } = await supabase.rpc('get_customer_portal_data', {
      p_customer_id: customerId,
      p_session_token: sessionToken,
    });
    if (error || !data) {
      if (error?.message?.includes('Could not convert')) {
        return null;
      }
      return null;
    }
    const parsed = data as CustomerPortalData;
    setPortalData(parsed);
    if (parsed.customer) setCustomer(parsed.customer);
    return parsed;
  }, [customerId, sessionToken]);

  // Load portal data when session is restored
  useEffect(() => {
    if (customerId && sessionToken && loading) {
      (async () => {
        await loadPortalData();
        setLoading(false);
      })();
    }
  }, [customerId, sessionToken, loading, loadPortalData]);

  const login = useCallback(async (mobile: string, password: string) => {
    const { data, error } = await supabase.rpc('verify_customer_login', {
      p_mobile: mobile,
      p_password: password,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Invalid mobile number or password' };

    const result = data as SessionInfo;
    setCustomerId(result.customerId);
    setSessionToken(result.sessionToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customerId: result.customerId,
      sessionToken: result.sessionToken,
      customerName: result.customerName,
    }));
    return { success: true };
  }, []);

  const activate = useCallback(async (mobile: string, membershipId: string, password: string) => {
    const { data, error } = await supabase.rpc('activate_customer_account', {
      p_mobile: mobile,
      p_membership_id: membershipId,
      p_password: password,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Mobile number and Membership ID do not match any customer record' };

    const result = data as SessionInfo;
    setCustomerId(result.customerId);
    setSessionToken(result.sessionToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customerId: result.customerId,
      sessionToken: result.sessionToken,
      customerName: result.customerName,
    }));
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (sessionToken) {
      await supabase.rpc('logout_customer_session', { p_session_token: sessionToken });
    }
    setCustomerId(null);
    setSessionToken(null);
    setCustomer(null);
    setPortalData(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [sessionToken]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!customerId || !sessionToken) return { success: false, error: 'Not logged in' };
    const { data, error } = await supabase.rpc('change_customer_password', {
      p_customer_id: customerId,
      p_session_token: sessionToken,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Current password is incorrect' };
    return { success: true };
  }, [customerId, sessionToken]);

  return (
    <CustomerAuthContext.Provider value={{
      customerId, customer, sessionToken, loading,
      login, activate, logout, changePassword, refreshCustomer,
      portalData, loadPortalData,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
