import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AdminSession } from '@/types';

interface AdminAuthState {
  adminId: string | null;
  adminName: string | null;
  sessionToken: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

const ADMIN_STORAGE_KEY = 'pharmos_admin_session';

function loadSession(): AdminSession | null {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.adminId && parsed.sessionToken) {
      return parsed as AdminSession;
    }
  } catch {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
  return null;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setAdminId(session.adminId);
      setSessionToken(session.sessionToken);
      setAdminName(session.fullName ?? 'Administrator');
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (userId: string, password: string) => {
    const { data, error } = await supabase.rpc('verify_admin_login', {
      p_username: userId.trim(),
      p_password: password,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Invalid User ID or password' };

    const result = data as { admin_id: string; session_token: string; full_name: string };
    setAdminId(result.admin_id);
    setSessionToken(result.session_token);
    setAdminName(result.full_name);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({
      adminId: result.admin_id,
      sessionToken: result.session_token,
      fullName: result.full_name,
    }));
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (sessionToken) {
      await supabase.rpc('logout_admin_session', { p_session_token: sessionToken });
    }
    setAdminId(null);
    setSessionToken(null);
    setAdminName(null);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }, [sessionToken]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!adminId || !sessionToken) return { success: false, error: 'Not logged in' };
    const { data, error } = await supabase.rpc('change_admin_password', {
      p_admin_id: adminId,
      p_session_token: sessionToken,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    });
    if (error) return { success: false, error: error.message };
    return { success: !!data };
  }, [adminId, sessionToken]);

  return (
    <AdminAuthContext.Provider value={{
      adminId, adminName, sessionToken, loading,
      isAdmin: !!adminId && !!sessionToken,
      login, logout, changePassword,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}