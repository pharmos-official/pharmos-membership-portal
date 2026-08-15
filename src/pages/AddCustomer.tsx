import { useState } from 'react';
import { UserPlus, Check, ArrowLeft } from 'lucide-react';
import type { Page } from '@/components/Layout';
import type { Customer, Membership } from '@/types';
import { supabase } from '@/lib/supabase';
import { generateMembershipId, calcExpiry, toISODate } from '@/lib/helpers';
import { showToast } from '@/components/Toast';
import { MembershipCard } from '@/components/MembershipCard';

interface Props {
  navigate: (page: Page, params?: Record<string, string>) => void;
}

export function AddCustomer({ navigate }: Props) {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    address: '',
    date_of_birth: '',
    gender: '',
    notes: '',
    start_date: toISODate(new Date()),
    plan: 'basic' as 'basic' | 'prime',
    prime_enabled: false,
  });
  const [showPrimeToggle, setShowPrimeToggle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ customer: Customer; membership: Membership } | null>(null);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      showToast('Name and mobile number are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const membershipId = await generateMembershipId();
      const expiryDate = calcExpiry(form.start_date);

      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          address: form.address.trim() || null,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();

      if (custErr || !customer) {
        showToast(custErr?.message ?? 'Failed to create customer', 'error');
        setSaving(false);
        return;
      }

      const { data: membership, error: memErr } = await supabase
        .from('memberships')
        .insert({
          customer_id: customer.id,
          membership_id: membershipId,
          start_date: form.start_date,
          expiry_date: expiryDate,
          plan: form.plan,
          status: 'active',
          prime_enabled: form.prime_enabled,
        })
        .select()
        .single();

      if (memErr || !membership) {
        showToast('Customer created but membership failed. Please retry membership.', 'error');
        setSaving(false);
        return;
      }

      setSuccess({ customer, membership });
      showToast(`Membership ${membershipId} created successfully!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
    setSaving(false);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card flex items-center gap-4 border-emerald-200 bg-emerald-50 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Check size={24} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Member Registered Successfully!</h2>
            <p className="text-sm text-slate-600">
              {success.customer.name} has been assigned membership ID{' '}
              <span className="font-bold text-pharmos-700">{success.membership.membership_id}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <MembershipCard customer={success.customer} membership={success.membership} />
          <div className="card p-6">
            <h3 className="font-display text-base font-bold text-slate-800">Next Steps</h3>
            <p className="mt-2 text-sm text-slate-500">
              You can now record medicine purchases and health checkups for this member.
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate('customer-profile', { id: success.customer.id })}
                className="btn-primary w-full"
              >
                View Member Profile
              </button>
              <button onClick={() => navigate('add-customer')} className="btn-outline w-full">
                Add Another Member
              </button>
              <button onClick={() => navigate('dashboard')} className="btn-ghost w-full">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('customers')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Add New Member</h1>
          <p className="mt-0.5 text-sm text-slate-500">Create a PHARMOS membership for a new customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
            <UserPlus size={20} className="text-pharmos-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Customer Information</h2>
            <p className="text-xs text-slate-500">A unique membership ID will be generated automatically</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Customer Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Amit Sharma"
              required
            />
          </div>
          <div>
            <label className="label">Mobile Number *</label>
            <input
              className="input"
              value={form.mobile}
              onChange={e => update('mobile', e.target.value)}
              placeholder="e.g. 98XXXXXXXX"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.address}
            onChange={e => update('address', e.target.value)}
            placeholder="Full address"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              className="input"
              value={form.date_of_birth}
              onChange={e => update('date_of_birth', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={e => update('gender', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Membership Start Date</label>
            <input
              type="date"
              className="input"
              value={form.start_date}
              onChange={e => update('start_date', e.target.value)}
            />
          </div>
        </div>

        {/* Membership Plan */}
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Membership Plan</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setForm(prev => ({ ...prev, plan: 'basic' })); setShowPrimeToggle(false); }}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                form.plan === 'basic'
                  ? 'border-pharmos-500 bg-pharmos-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-bold text-slate-800">₹99 Basic</p>
              <p className="mt-0.5 text-xs text-slate-500">View health records only</p>
            </button>
            <button
              type="button"
              onClick={() => { setForm(prev => ({ ...prev, plan: 'prime', prime_enabled: true })); setShowPrimeToggle(true); }}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                form.plan === 'prime'
                  ? 'border-gold-400 bg-gold-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-bold text-slate-800">₹199 Pharmos Prime</p>
              <p className="mt-0.5 text-xs text-slate-500">View + Upload personal documents</p>
            </button>
          </div>

          {form.plan === 'prime' && (
            <label className="mt-3 flex items-center justify-between rounded-lg border border-gold-200 bg-white p-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Pharmos Prime Enabled</p>
                <p className="text-xs text-slate-400">Immediately available to member after login</p>
              </div>
              <input
                type="checkbox"
                checked={form.prime_enabled}
                onChange={e => setForm(prev => ({ ...prev, prime_enabled: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-pharmos-600 focus:ring-pharmos-500"
              />
            </label>
          )}
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input min-h-[60px] resize-y"
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Any additional notes about the customer"
          />
        </div>

        <div className="rounded-lg bg-pharmos-50 p-4">
          <p className="text-xs text-pharmos-700">
            <span className="font-semibold">Membership will be valid for 1 year.</span> The expiry date and
            unique membership ID (PHM000001 format) are generated automatically on creation.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => navigate('customers')} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Membership'}
          </button>
        </div>
      </form>
    </div>
  );
}
