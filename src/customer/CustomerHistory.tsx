import { Activity, Droplet, Stethoscope, Pill, History } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { formatDate, formatTime } from '@/lib/helpers';

interface TimelineEntry {
  date: string;
  time: string;
  type: 'bp' | 'sugar' | 'ecg' | 'medicine';
  title: string;
  detail: string;
}

export function CustomerHistory() {
  const { data, loading } = usePortalData();

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const { bp_records, sugar_records, ecg_records, medicine_purchases } = data;

  const entries: TimelineEntry[] = [
    ...bp_records.map(r => ({
      date: r.checkup_date, time: r.checkup_time, type: 'bp' as const,
      title: 'BP Checkup', detail: `${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · ${r.pulse} bpm` : ''}`,
    })),
    ...sugar_records.map(r => ({
      date: r.checkup_date, time: r.checkup_time, type: 'sugar' as const,
      title: 'Sugar Checkup', detail: `${r.test_type}: ${r.reading} ${r.unit}`,
    })),
    ...ecg_records.map(r => ({
      date: r.checkup_date, time: r.checkup_time, type: 'ecg' as const,
      title: 'ECG Checkup', detail: r.result || 'ECG recorded',
    })),
    ...medicine_purchases.map(p => ({
      date: p.purchase_date, time: '', type: 'medicine' as const,
      title: 'Medicine Purchase', detail: `${p.medicine_name} — ${p.quantity} ${p.unit}`,
    })),
  ].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return (b.time || '').localeCompare(a.time || '');
  });

  const typeConfig = {
    bp: { icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
    sugar: { icon: Droplet, color: 'text-gold-600', bg: 'bg-gold-50' },
    ecg: { icon: Stethoscope, color: 'text-pharmos-600', bg: 'bg-pharmos-50' },
    medicine: { icon: Pill, color: 'text-pharmos-600', bg: 'bg-pharmos-50' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
          <History size={20} className="text-pharmos-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">My History</h1>
          <p className="mt-0.5 text-sm text-slate-500">A timeline of all your PHARMOS activity</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card p-12 text-center">
          <History size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-4">
            {entries.map((e, i) => {
              const cfg = typeConfig[e.type];
              const Icon = cfg.icon;
              return (
                <div key={i} className="relative flex gap-4 pl-0">
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.bg} ring-4 ring-slate-50`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(e.date)}{e.time && ` · ${formatTime(e.time)}`}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{e.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
