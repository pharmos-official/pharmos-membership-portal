import { Droplet } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { formatDate, formatTime } from '@/lib/helpers';

export function CustomerSugar() {
  const { data, loading } = usePortalData();

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const records = data.sugar_records;

  const getLevel = (testType: string, reading: number) => {
    if (testType === 'HbA1c') {
      if (reading < 5.7) return { color: 'text-emerald-500', label: 'Normal' };
      if (reading < 6.5) return { color: 'text-gold-500', label: 'Pre-diabetes' };
      return { color: 'text-red-500', label: 'Diabetes' };
    }
    if (testType === 'Fasting') {
      if (reading < 100) return { color: 'text-emerald-500', label: 'Normal' };
      if (reading < 126) return { color: 'text-gold-500', label: 'Impaired' };
      return { color: 'text-red-500', label: 'High' };
    }
    if (reading < 140) return { color: 'text-emerald-500', label: 'Normal' };
    if (reading < 200) return { color: 'text-gold-500', label: 'Impaired' };
    return { color: 'text-red-500', label: 'High' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
          <Droplet size={20} className="text-gold-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Blood Sugar History</h1>
          <p className="mt-0.5 text-sm text-slate-500">All your sugar test readings</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card p-12 text-center">
          <Droplet size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No sugar records yet. Visit PHARMOS for a checkup.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const level = getLevel(r.test_type, r.reading);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-50">
                      <Droplet size={22} className="text-gold-600" />
                    </div>
                    <div>
                      <p className="font-display text-xl font-bold text-slate-800">{r.reading} <span className="text-sm font-medium text-slate-500">{r.unit}</span></p>
                      <p className="text-xs text-slate-500">{r.test_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${level.color}`}>{level.label}</span>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(r.checkup_date)} · {formatTime(r.checkup_time)}</p>
                  </div>
                </div>
                {r.notes && <p className="mt-2 text-xs text-slate-500">{r.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">These readings are recorded by PHARMOS staff. You can only view them.</p>
    </div>
  );
}
