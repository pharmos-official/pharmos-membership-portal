import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, MessageCircle, IndianRupee, Lock, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/admin-auth';
import { useAppSettings } from '@/lib/settings';
import { showToast } from '@/components/Toast';
import type { AppSettings } from '@/types';

export function AdminSettings() {
  const { sessionToken, changePassword } = useAdminAuth();
  const { settings, reload } = useAppSettings();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const update = (field: keyof AppSettings, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setSaving(true);
    try {
      const keys: (keyof AppSettings)[] = [
        'whatsapp_number', 'whatsapp_message',
        'basic_plan_price', 'basic_plan_label',
        'prime_plan_price', 'prime_plan_label',
      ];
      for (const key of keys) {
        const { error } = await supabase.rpc('update_app_setting', {
          p_admin_session_token: sessionToken,
          p_key: key,
          p_value: form[key],
        });
        if (error) {
          showToast(`Failed to save ${key}: ${error.message}`, 'error');
          setSaving(false);
          return;
        }
      }
      await reload();
      setSaved(true);
      showToast('Settings saved successfully', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setChangingPassword(true);
    const result = await changePassword(oldPassword, newPassword);
    setChangingPassword(false);
    if (result.success) {
      showToast('Password changed successfully', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(result.error || 'Failed to change password', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
          <SettingsIcon size={20} className="text-pharmos-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Plans & Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">Configure WhatsApp, plan prices, and admin security</p>
        </div>
      </div>

      {/* WhatsApp & Plan Settings */}
      <form onSubmit={handleSave} className="card space-y-6 p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <MessageCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">WhatsApp Account Creation</h2>
            <p className="text-xs text-slate-500">Used for the "Create New Account" button on the login page</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">WhatsApp Number (with country code)</label>
            <input
              className="input"
              value={form.whatsapp_number}
              onChange={e => update('whatsapp_number', e.target.value)}
              placeholder="e.g. 919876543210"
            />
            <p className="mt-1 text-[11px] text-slate-400">Include country code without + sign</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">WhatsApp Message</label>
            <textarea
              className="input min-h-[70px] resize-y"
              value={form.whatsapp_message}
              onChange={e => update('whatsapp_message', e.target.value)}
              placeholder="Pre-filled message for new account requests"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
            <IndianRupee size={20} className="text-gold-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Membership Plans & Pricing</h2>
            <p className="text-xs text-slate-500">Configurable plan names and yearly prices</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Basic Plan Name</label>
            <input className="input" value={form.basic_plan_label} onChange={e => update('basic_plan_label', e.target.value)} />
          </div>
          <div>
            <label className="label">Basic Plan Price (₹/year)</label>
            <input type="number" min="0" className="input" value={form.basic_plan_price} onChange={e => update('basic_plan_price', e.target.value)} />
          </div>
          <div>
            <label className="label">Prime Plan Name</label>
            <input className="input" value={form.prime_plan_label} onChange={e => update('prime_plan_label', e.target.value)} />
          </div>
          <div>
            <label className="label">Prime Plan Price (₹/year)</label>
            <input type="number" min="0" className="input" value={form.prime_plan_price} onChange={e => update('prime_plan_price', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          {saved && (
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check size={16} /> Saved
            </span>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      </form>

      {/* Change Admin Password */}
      <form onSubmit={handleChangePassword} className="card space-y-4 p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <Lock size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Change Admin Password</h2>
            <p className="text-xs text-slate-500">Update your admin panel password</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" required />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={changingPassword} className="btn-outline">
            {changingPassword ? <><Loader2 size={16} className="animate-spin" /> Changing…</> : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}