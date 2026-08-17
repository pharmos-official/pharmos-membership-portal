import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Pill,
  HeartPulse,
  Droplet,
  Activity,
  Plus,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  ChevronDown,
  KeyRound,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import type { Page, CustomerProfile as Profile, MedicinePurchase, RoutineMedicine, RoutineMedicineTotal, BpRecord, SugarRecord, EcgRecord, EcgAttachment } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  formatDate,
  formatTime,
  membershipStatus,
  daysUntilExpiry,
  customerStatus,
  consistencyPercent,
  lastPurchaseDate,
  nextExpectedPurchase,
  lastCheckupDate,
  checkupThisMonth,
  groupByMonth,
  monthKey,
} from '@/lib/helpers';
import { MembershipCard } from '@/components/MembershipCard';
import { AddMedicineModal } from '@/components/AddMedicineModal';
import { AddBpModal } from '@/components/AddBpModal';
import { AddSugarModal } from '@/components/AddSugarModal';
import { AddEcgModal } from '@/components/AddEcgModal';
import { RoutineMedicineModal } from '@/components/RoutineMedicineModal';
import { AdminMemberDocuments } from '@/pages/AdminMemberDocuments';
import { showToast } from '@/components/Toast';

interface Props {
  customerId: string;
  navigate: (page: Page, params?: Record<string, string>) => void;
}

type Tab = 'overview' | 'medicine' | 'routine' | 'health' | 'timeline' | 'prime';

export function CustomerProfile({ customerId, navigate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [modals, setModals] = useState({ medicine: false, bp: false, sugar: false, ecg: false, routine: false });
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);

  const loadCredentials = useCallback(async (customerName: string, mobile: string) => {
    setLoadingCreds(true);
    try {
      const firstName = customerName.trim().split(/\s+/)[0] || 'member';
      setPassword(firstName);
    } finally {
      setLoadingCreds(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [cust, memberships, med, routine, routineTotals, bp, sugar, ecg] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
      supabase.from('memberships').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('medicine_purchases').select('*').eq('customer_id', customerId).order('purchase_date', { ascending: false }),
      supabase.from('routine_medicines').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('routine_medicine_totals').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('bp_records').select('*').eq('customer_id', customerId).order('checkup_date', { ascending: false }),
      supabase.from('sugar_records').select('*').eq('customer_id', customerId).order('checkup_date', { ascending: false }),
      supabase.from('ecg_records').select('*, ecg_attachments(*)').eq('customer_id', customerId).order('checkup_date', { ascending: false }),
    ]);
    if (!cust.data) {
      showToast('Customer not found', 'error');
      navigate('customers');
      return;
    }
    setProfile({
      ...cust.data,
      membership: memberships.data?.[0] ?? null,
      medicine_purchases: (med.data ?? []) as MedicinePurchase[],
      routine_medicines: (routine.data ?? []) as RoutineMedicine[],
      routine_medicine_totals: (routineTotals.data ?? []) as RoutineMedicineTotal[],
      bp_records: (bp.data ?? []) as BpRecord[],
      sugar_records: (sugar.data ?? []) as SugarRecord[],
      ecg_records: (ecg.data ?? []) as EcgRecord[],
    });
    await loadCredentials(cust.data.name, cust.data.mobile);
    setLoading(false);
  }, [customerId, navigate, loadCredentials]);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const memStatus = membershipStatus(profile.membership?.expiry_date ?? null);
  const daysLeft = daysUntilExpiry(profile.membership?.expiry_date ?? null);
  const status = customerStatus(profile.membership, profile.medicine_purchases);
  const consistency = consistencyPercent(profile.medicine_purchases);
  const lastPurch = lastPurchaseDate(profile.medicine_purchases);
  const nextDue = nextExpectedPurchase(profile.medicine_purchases);
  const lastChk = lastCheckupDate(profile.bp_records, profile.sugar_records, profile.ecg_records);

  const now = new Date();
  const bpThisMonth = checkupThisMonth(profile.bp_records, now.getFullYear(), now.getMonth());
  const sugarThisMonth = checkupThisMonth(profile.sugar_records, now.getFullYear(), now.getMonth());
  const ecgThisMonth = checkupThisMonth(profile.ecg_records, now.getFullYear(), now.getMonth());

  // Regular medicines (frequency)
  const medCounts = new Map<string, number>();
  profile.medicine_purchases.forEach(p => {
    medCounts.set(p.medicine_name, (medCounts.get(p.medicine_name) ?? 0) + 1);
  });
  const regularMedicines = Array.from(medCounts.entries()).sort((a, b) => b[1] - a[1]);

  // Timeline
  type TimelineItem = { date: string; type: 'medicine' | 'bp' | 'sugar' | 'ecg'; title: string; desc: string };
  const timeline: TimelineItem[] = [
    ...profile.medicine_purchases.map(p => ({ date: p.purchase_date, type: 'medicine' as const, title: 'Medicine Purchase', desc: `${p.medicine_name} — ${p.quantity} ${p.unit} (${p.days_of_medicine} days)` })),
    ...profile.bp_records.map(r => ({ date: r.checkup_date, type: 'bp' as const, title: 'BP Checkup', desc: `${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · Pulse: ${r.pulse}` : ''}` })),
    ...profile.sugar_records.map(r => ({ date: r.checkup_date, type: 'sugar' as const, title: `${r.test_type} Sugar`, desc: `${r.reading} ${r.unit}` })),
    ...profile.ecg_records.map(r => ({ date: r.checkup_date, type: 'ecg' as const, title: 'ECG Checkup', desc: r.result ?? 'ECG recorded' })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Health history by month
  const healthByMonth = new Map<string, { bp: BpRecord[]; sugar: SugarRecord[]; ecg: EcgRecord[] }>();
  for (const r of profile.bp_records) {
    const k = monthKey(r.checkup_date);
    if (!healthByMonth.has(k)) healthByMonth.set(k, { bp: [], sugar: [], ecg: [] });
    healthByMonth.get(k)!.bp.push(r);
  }
  for (const r of profile.sugar_records) {
    const k = monthKey(r.checkup_date);
    if (!healthByMonth.has(k)) healthByMonth.set(k, { bp: [], sugar: [], ecg: [] });
    healthByMonth.get(k)!.sugar.push(r);
  }
  for (const r of profile.ecg_records) {
    const k = monthKey(r.checkup_date);
    if (!healthByMonth.has(k)) healthByMonth.set(k, { bp: [], sugar: [], ecg: [] });
    healthByMonth.get(k)!.ecg.push(r);
  }
  const sortedHealthMonths = Array.from(healthByMonth.keys()).sort((a, b) => b.localeCompare(a));

  // Medicine by month
  const medByMonth = groupByMonth(profile.medicine_purchases, 'purchase_date');
  const sortedMedMonths = Array.from(medByMonth.keys()).sort((a, b) => b.localeCompare(a));

  const openModal = (m: keyof typeof modals) => setModals(prev => ({ ...prev, [m]: true }));
  const closeModal = (m: keyof typeof modals) => setModals(prev => ({ ...prev, [m]: false }));

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate('customers')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={18} /> Back to Customers
      </button>

      {/* Summary header */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MembershipCard customer={profile} membership={profile.membership} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          {/* Customer info */}
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pharmos-100 text-lg font-bold text-pharmos-700">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-800">{profile.name}</h1>
                  <p className="text-sm text-slate-500">{profile.membership?.membership_id ?? 'No membership'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`badge-${status.tone}`}>{status.label}</span>
                <span className={memStatus === 'Active' ? 'badge-green' : 'badge-red'}>{memStatus}</span>
                {memStatus === 'Active' && daysLeft <= 30 && (
                  <span className="badge-gold">Expires in {daysLeft}d</span>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400" /> {profile.mobile}
              </div>
              {profile.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" /> {profile.address}
                </div>
              )}
              {profile.date_of_birth && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" /> DOB: {formatDate(profile.date_of_birth)}
                </div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400">{profile.gender}</span>
                </div>
              )}
            </div>
          </div>

          {/* Login Credentials */}
          <div className="card border-gold-200 bg-gold-50/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Customer Login</h3>
              <KeyRound size={18} className="text-gold-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">Auto-generated credentials — share with the customer</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">User ID</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-800">{profile.mobile}</p>
                <p className="text-[10px] text-slate-400">Mobile number</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Password</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-800">{password ?? '—'}</p>
                <p className="text-[10px] text-slate-400">First name</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last Purchase</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(lastPurch)}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next Expected</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(nextDue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Purchases</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{profile.medicine_purchases.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Consistency</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{consistency}%</p>
            </div>
          </div>

          {/* Monthly checkup status */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">This Month's Checkup</h3>
              <span className="text-xs text-slate-400">{now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <CheckupStatus icon={HeartPulse} label="BP" done={bpThisMonth} color="rose" onClick={() => openModal('bp')} />
              <CheckupStatus icon={Droplet} label="Sugar" done={sugarThisMonth} color="amber" onClick={() => openModal('sugar')} />
              <CheckupStatus icon={Activity} label="ECG" done={ecgThisMonth} color="pharmos" onClick={() => openModal('ecg')} />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => openModal('medicine')} className="btn-primary"><Pill size={18} /> Add Medicine Purchase</button>
        <button onClick={() => openModal('bp')} className="btn-outline"><HeartPulse size={18} /> Record BP</button>
        <button onClick={() => openModal('sugar')} className="btn-outline"><Droplet size={18} /> Record Sugar</button>
        <button onClick={() => openModal('ecg')} className="btn-outline"><Activity size={18} /> Record ECG</button>
        <button onClick={() => openModal('routine')} className="btn-outline"><Pill size={18} /> Routine Medicine</button>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-200">
          {(['overview', 'medicine', 'routine', 'health', 'timeline', 'prime'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-pharmos-500 text-pharmos-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'overview' ? 'Overview' : t === 'medicine' ? 'Medicine History' : t === 'routine' ? 'Routine Medicine' : t === 'health' ? 'Health History' : t === 'prime' ? 'Prime Docs' : 'Timeline'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <OverviewTab profile={profile} regularMedicines={regularMedicines} consistency={consistency} lastPurch={lastPurch} nextDue={nextDue} lastChk={lastChk} />
          )}
          {tab === 'medicine' && (
            <MedicineTab medByMonth={medByMonth} sortedMedMonths={sortedMedMonths} />
          )}
          {tab === 'routine' && (
            <RoutineMedicineTab routineMedicines={profile.routine_medicines} routineMedicineTotals={profile.routine_medicine_totals} onSaved={load} />
          )}
          {tab === 'health' && (
            <HealthTab healthByMonth={healthByMonth} sortedHealthMonths={sortedHealthMonths} expandedMonth={expandedMonth} setExpandedMonth={setExpandedMonth} />
          )}
          {tab === 'timeline' && (
            <TimelineTab timeline={timeline} />
          )}
          {tab === 'prime' && (
            <AdminMemberDocuments customerId={profile.id} />
          )}
        </div>
      </div>

      {/* Modals */}
      {profile.membership && (
        <AddMedicineModal
          open={modals.medicine}
          onClose={() => closeModal('medicine')}
          customerId={profile.id}
          membershipId={profile.membership.membership_id}
          onSaved={load}
        />
      )}
      <AddBpModal open={modals.bp} onClose={() => closeModal('bp')} customerId={profile.id} onSaved={load} />
      <AddSugarModal open={modals.sugar} onClose={() => closeModal('sugar')} customerId={profile.id} onSaved={load} />
      <AddEcgModal open={modals.ecg} onClose={() => closeModal('ecg')} customerId={profile.id} onSaved={load} />
      {profile.membership && (
        <RoutineMedicineModal
          open={modals.routine}
          onClose={() => closeModal('routine')}
          customerId={profile.id}
          membershipId={profile.membership.membership_id}
          onSaved={load}
        />
      )}
    </div>
  );
}

function CheckupStatus({ icon: Icon, label, done, color, onClick }: {
  icon: typeof HeartPulse; label: string; done: boolean; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    pharmos: 'bg-pharmos-50 text-pharmos-600',
  };
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 p-3 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {done ? (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
          <CheckCircle2 size={12} /> Completed
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
          <XCircle size={12} /> Pending
        </span>
      )}
    </button>
  );
}

function OverviewTab({ profile, regularMedicines, consistency, lastPurch, nextDue, lastChk }: {
  profile: Profile;
  regularMedicines: [string, number][];
  consistency: number;
  lastPurch: string | null;
  nextDue: string | null;
  lastChk: string | null;
}) {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d;
  }).reverse();

  const purchasedMonths = new Set(
    profile.medicine_purchases.map(p => {
      const d = new Date(p.purchase_date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <TrendingUp size={18} className="text-pharmos-600" /> Medicine Consistency (Last 6 Months)
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {last6Months.map(d => {
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const hasPurchased = purchasedMonths.has(key);
            return (
              <div key={key} className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 ${
                hasPurchased ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className="text-[10px] font-medium text-slate-500">
                  {d.toLocaleDateString('en-GB', { month: 'short' })}
                </span>
                {hasPurchased ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <XCircle size={18} className="text-slate-300" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-600" /> Purchased</span>
          <span className="flex items-center gap-1"><XCircle size={14} className="text-slate-300" /> Missed</span>
          <span className="ml-auto font-semibold text-slate-700">Consistency: {consistency}%</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-400">Last Purchase</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(lastPurch)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-400">Expected Next Purchase</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(nextDue)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-400">Last Checkup</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(lastChk)}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-800">Regular Medicines</h3>
        {regularMedicines.length === 0 ? (
          <p className="text-sm text-slate-400">No medicine purchases recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {regularMedicines.slice(0, 10).map(([name, count]) => (
              <span key={name} className="badge-blue">
                {name} <span className="ml-1 text-pharmos-400">×{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {profile.notes && (
        <div className="rounded-lg border border-gold-200 bg-gold-50 p-4">
          <p className="text-xs font-semibold text-gold-700">Notes</p>
          <p className="mt-1 text-sm text-slate-700">{profile.notes}</p>
        </div>
      )}
    </div>
  );
}

function MedicineTab({ medByMonth, sortedMedMonths }: {
  medByMonth: Map<string, MedicinePurchase[]>;
  sortedMedMonths: string[];
}) {
  if (sortedMedMonths.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No medicine purchases recorded yet.</p>;
  }
  return (
    <div className="space-y-5">
      {sortedMedMonths.map(month => {
        const purchases = medByMonth.get(month)!;
        const [y, m] = month.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        return (
          <div key={month}>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Calendar size={16} className="text-pharmos-500" /> {label}
              <span className="text-xs font-normal text-slate-400">({purchases.length} {purchases.length === 1 ? 'item' : 'items'})</span>
            </h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Medicine</th>
                    <th className="px-4 py-2 text-left font-semibold">Qty</th>
                    <th className="px-4 py-2 text-left font-semibold">Days</th>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">Next Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{p.medicine_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.quantity} {p.unit}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.days_of_medicine}d</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(p.purchase_date)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(p.next_due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoutineMedicineTab({ routineMedicines, routineMedicineTotals, onSaved }: { routineMedicines: RoutineMedicine[]; routineMedicineTotals: RoutineMedicineTotal[]; onSaved: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ medicine_name: '', quantity: '', unit: 'tablet', total_amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const units = ['tablet', 'capsule', 'bottle', 'strip', 'box', 'ml', 'unit'];

  const startEdit = (r: RoutineMedicine) => {
    setEditingId(r.id);
    setEditForm({
      medicine_name: r.medicine_name,
      quantity: String(r.quantity),
      unit: r.unit,
      total_amount: r.total_amount != null ? String(r.total_amount) : '',
      notes: r.notes ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.medicine_name.trim()) {
      showToast('Medicine name is required', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('routine_medicines')
      .update({
        medicine_name: editForm.medicine_name.trim(),
        quantity: parseFloat(editForm.quantity) || 1,
        unit: editForm.unit,
        total_amount: editForm.total_amount.trim() ? parseFloat(editForm.total_amount) : null,
        notes: editForm.notes.trim() || null,
      })
      .eq('id', id);
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Routine medicine updated', 'success');
    setEditingId(null);
    onSaved();
  };

  const deleteMedicine = async (r: RoutineMedicine) => {
    if (!window.confirm(`Delete "${r.medicine_name}" from routine medicines?`)) return;
    const { error } = await supabase.from('routine_medicines').delete().eq('id', r.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Routine medicine deleted', 'success');
    onSaved();
  };

  if (routineMedicines.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No routine medicines recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Medicine Name</th>
            <th className="px-4 py-2 text-right font-semibold">Quantity</th>
            <th className="px-4 py-2 text-left font-semibold">Unit</th>
            <th className="px-4 py-2 text-right font-semibold">Total Amount</th>
            <th className="px-4 py-2 text-left font-semibold">Note</th>
            <th className="px-4 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {routineMedicines.map(r => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} className="hover:bg-slate-50">
                {isEditing ? (
                  <>
                    <td className="px-2 py-2">
                      <input
                        className="input py-2"
                        value={editForm.medicine_name}
                        onChange={e => setEditForm(f => ({ ...f, medicine_name: e.target.value }))}
                        placeholder="Medicine name"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="1"
                        className="input py-2 text-right"
                        value={editForm.quantity}
                        onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="input py-2"
                        value={editForm.unit}
                        onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                      >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input py-2 text-right"
                        value={editForm.total_amount}
                        onChange={e => setEditForm(f => ({ ...f, total_amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="input py-2"
                        value={editForm.notes}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Note"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={saving}
                          className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.medicine_name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.quantity}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.unit}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.total_amount != null ? `₹${r.total_amount}` : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.notes ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(r)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-pharmos-50 hover:text-pharmos-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteMedicine(r)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {routineMedicineTotals.length > 0 && (() => {
        const latestTotal = routineMedicineTotals[0];
        return (
          <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-700">
              Total Amount of Medicines: <span className="text-pharmos-700">{latestTotal.total_amount != null ? `₹${latestTotal.total_amount}` : '—'}</span>
            </p>
          </div>
        );
      })()}
    </div>
  );
}

function HealthTab({ healthByMonth, sortedHealthMonths, expandedMonth, setExpandedMonth }: {
  healthByMonth: Map<string, { bp: BpRecord[]; sugar: SugarRecord[]; ecg: EcgRecord[] }>;
  sortedHealthMonths: string[];
  expandedMonth: string | null;
  setExpandedMonth: (m: string | null) => void;
}) {
  if (sortedHealthMonths.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No health checkups recorded yet.</p>;
  }
  return (
    <div className="space-y-3">
      {sortedHealthMonths.map(month => {
        const data = healthByMonth.get(month)!;
        const [y, m] = month.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        const isExpanded = expandedMonth === month || sortedHealthMonths.length <= 3;
        return (
          <div key={month} className="rounded-lg border border-slate-200">
            <button
              onClick={() => setExpandedMonth(isExpanded ? null : month)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-bold text-slate-800">{label}</span>
              <div className="flex items-center gap-3">
                <span className="flex gap-1.5">
                  {data.bp.length > 0 && <span className="badge-red">BP ×{data.bp.length}</span>}
                  {data.sugar.length > 0 && <span className="badge-gold">Sugar ×{data.sugar.length}</span>}
                  {data.ecg.length > 0 && <span className="badge-blue">ECG ×{data.ecg.length}</span>}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {isExpanded && (
              <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                {data.bp.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-rose-600">Blood Pressure</p>
                    {data.bp.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-1 text-sm">
                        <span className="font-medium text-slate-800">{r.systolic}/{r.diastolic} mmHg{r.pulse ? ` · ${r.pulse} bpm` : ''}</span>
                        <span className="text-xs text-slate-400">{formatDate(r.checkup_date)} · {formatTime(r.checkup_time)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {data.sugar.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-amber-600">Blood Sugar</p>
                    {data.sugar.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-1 text-sm">
                        <span className="font-medium text-slate-800">{r.test_type}: {r.reading} {r.unit}</span>
                        <span className="text-xs text-slate-400">{formatDate(r.checkup_date)} · {formatTime(r.checkup_time)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {data.ecg.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-pharmos-600">ECG</p>
                    {data.ecg.map(r => (
                      <div key={r.id} className="py-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-800">{r.result ?? 'ECG recorded'}</span>
                          <span className="text-xs text-slate-400">{formatDate(r.checkup_date)} · {formatTime(r.checkup_time)}</span>
                        </div>
                        {r.ecg_attachments && r.ecg_attachments.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {r.ecg_attachments.map(att => (
                              <AttachmentLink key={att.id} att={att} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttachmentLink({ att }: { att: EcgAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = att.file_type.startsWith('image');
  const isPdf = att.file_type === 'application/pdf' || att.file_name.endsWith('.pdf');
  const isVideo = att.file_type.startsWith('video');

  const handleOpen = async () => {
    if (url) {
      window.open(url, '_blank');
      return;
    }
    const { data } = await supabase.storage.from('ecg-attachments').createSignedUrl(att.file_path, 3600);
    if (data?.signedUrl) {
      setUrl(data.signedUrl);
      window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleOpen}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
    >
      {isImage ? <ImageIcon size={14} /> : isPdf ? <FileText size={14} className="text-red-500" /> : isVideo ? <Video size={14} className="text-pharmos-500" /> : <FileText size={14} />}
      {att.file_name}
      <Download size={12} className="text-slate-400" />
    </button>
  );
}

function TimelineTab({ timeline }: { timeline: { date: string; type: string; title: string; desc: string }[] }) {
  if (timeline.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No activity recorded yet.</p>;
  }
  const typeIcons: Record<string, typeof HeartPulse> = {
    medicine: Pill,
    bp: HeartPulse,
    sugar: Droplet,
    ecg: Activity,
  };
  const typeColors: Record<string, string> = {
    medicine: 'bg-pharmos-100 text-pharmos-600',
    bp: 'bg-rose-100 text-rose-600',
    sugar: 'bg-amber-100 text-amber-600',
    ecg: 'bg-pharmos-100 text-pharmos-600',
  };
  return (
    <div className="relative space-y-1">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
      {timeline.map((item, i) => {
        const Icon = typeIcons[item.type] ?? Clock;
        return (
          <div key={i} className="relative flex gap-4 py-2.5">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white ${typeColors[item.type]}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <span className="flex-shrink-0 text-xs text-slate-400">{formatDate(item.date)}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{item.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
