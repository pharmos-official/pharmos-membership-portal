import { useEffect, useState } from 'react';
import { HeartPulse, Droplet, Activity, ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/components/Layout';
import type { Customer, BpRecord, SugarRecord, EcgRecord } from '@/types';
import { formatDate, formatTime } from '@/lib/helpers';

type CheckupType = 'bp' | 'sugar' | 'ecg';

interface Props {
  type: CheckupType;
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const config: Record<CheckupType, { title: string; subtitle: string; icon: typeof HeartPulse; color: string; bg: string }> = {
  bp: { title: 'BP Checkup Records', subtitle: 'All blood pressure readings', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
  sugar: { title: 'Sugar Checkup Records', subtitle: 'All blood sugar readings', icon: Droplet, color: 'text-amber-600', bg: 'bg-amber-50' },
  ecg: { title: 'ECG Checkup Records', subtitle: 'All ECG checkup records', icon: Activity, color: 'text-pharmos-600', bg: 'bg-pharmos-50' },
};

export function HealthCheckupList({ type, navigate }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => { load(); }, [type]);

  const load = async () => {
    setLoading(true);
    let result;
    if (type === 'bp') {
      result = await supabase.from('bp_records').select('*, customers(*)').order('checkup_date', { ascending: false }).limit(200);
    } else if (type === 'sugar') {
      result = await supabase.from('sugar_records').select('*, customers(*)').order('checkup_date', { ascending: false }).limit(200);
    } else {
      result = await supabase.from('ecg_records').select('*, customers(*), ecg_attachments(*)').order('checkup_date', { ascending: false }).limit(200);
    }
    setRecords(result.data ?? []);
    setLoading(false);
  };

  const meta = config[type];
  const Icon = meta.icon;

  const filtered = records.filter((r: any) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.customers?.name?.toLowerCase().includes(q) || r.customer?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bg}`}>
          <Icon size={20} className={meta.color} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{meta.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{meta.subtitle}</p>
        </div>
      </div>

      <div className="card flex items-center gap-3 p-3">
        <Search size={20} className="ml-2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by customer name…"
          className="flex-1 border-0 bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Icon size={32} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  {type === 'bp' && <>
                    <th className="px-4 py-3 text-left font-semibold">Reading</th>
                    <th className="px-4 py-3 text-left font-semibold">Pulse</th>
                  </>}
                  {type === 'sugar' && <>
                    <th className="px-4 py-3 text-left font-semibold">Test Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Reading</th>
                  </>}
                  {type === 'ecg' && <>
                    <th className="px-4 py-3 text-left font-semibold">Result</th>
                    <th className="px-4 py-3 text-left font-semibold">Attachments</th>
                  </>}
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r: any) => {
                  const customer = r.customers ?? r.customer;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{customer?.name ?? 'Unknown'}</td>
                      {type === 'bp' && <>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${bpColor(r.systolic, r.diastolic)}`}>{r.systolic}/{r.diastolic}</span>
                          <span className="ml-1 text-xs text-slate-400">mmHg</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.pulse ?? '—'} bpm</td>
                      </>}
                      {type === 'sugar' && <>
                        <td className="px-4 py-3"><span className="badge-gold">{r.test_type}</span></td>
                        <td className="px-4 py-3 font-bold text-slate-800">{r.reading} <span className="text-xs font-normal text-slate-400">{r.unit}</span></td>
                      </>}
                      {type === 'ecg' && <>
                        <td className="px-4 py-3 text-slate-700">{r.result ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{r.ecg_attachments?.length ?? 0} file(s)</td>
                      </>}
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.checkup_date)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(r.checkup_time)}</td>
                      <td className="px-4 py-3">
                        {customer && (
                          <button onClick={() => navigate('customer-profile', { id: customer.id })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <ChevronRight size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function bpColor(sys: number, dia: number): string {
  if (sys >= 140 || dia >= 90) return 'text-red-600';
  if (sys >= 130 || dia >= 80) return 'text-amber-600';
  return 'text-emerald-600';
}
