import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { formatDate, formatTime } from '@/lib/helpers';

export function CustomerBp() {
  const { data, loading } = usePortalData();

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const records = data.bp_records;

  const getTrend = (systolic: number) => {
    if (systolic < 120) return { icon: TrendingDown, color: 'text-emerald-500', label: 'Normal' };
    if (systolic < 140) return { icon: Minus, color: 'text-gold-500', label: 'Elevated' };
    return { icon: TrendingUp, color: 'text-red-500', label: 'High' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
          <Activity size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Blood Pressure History</h1>
          <p className="mt-0.5 text-sm text-slate-500">All your BP readings in chronological order</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No BP records yet. Visit PHARMOS for a checkup.</p>
        </div>
      ) : (
        <>
          {/* Simple chart */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-sm font-bold text-slate-700">Systolic / Diastolic Trend (Last 10)</h2>
            <BpChart records={records.slice(0, 10).reverse()} />
          </div>

          {/* Records */}
          <div className="space-y-3">
            {records.map(r => {
              const trend = getTrend(r.systolic);
              const TrendIcon = trend.icon;
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
                        <Activity size={22} className="text-rose-600" />
                      </div>
                      <div>
                        <p className="font-display text-xl font-bold text-slate-800">{r.systolic}/{r.diastolic} <span className="text-sm font-medium text-slate-500">mmHg</span></p>
                        {r.pulse && <p className="text-xs text-slate-500">Pulse: {r.pulse} bpm</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trend.color}`}>
                        <TrendIcon size={14} /> {trend.label}
                      </span>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(r.checkup_date)} · {formatTime(r.checkup_time)}</p>
                    </div>
                  </div>
                  {r.notes && <p className="mt-2 text-xs text-slate-500">{r.notes}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-center text-xs text-slate-400">These readings are recorded by PHARMOS staff. You can only view them.</p>
    </div>
  );
}

function BpChart({ records }: { records: { systolic: number; diastolic: number; checkup_date: string }[] }) {
  if (records.length === 0) return null;
  const allValues = records.flatMap(r => [r.systolic, r.diastolic]);
  const min = Math.min(...allValues) - 10;
  const max = Math.max(...allValues) + 10;
  const range = max - min || 1;
  const width = 100;
  const height = 60;
  const step = records.length > 1 ? width / (records.length - 1) : 0;

  const toY = (v: number) => height - ((v - min) / range) * height;

  const systolicPoints = records.map((r, i) => `${i * step},${toY(r.systolic)}`).join(' ');
  const diastolicPoints = records.map((r, i) => `${i * step},${toY(r.diastolic)}`).join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height: '160px' }}>
        <polyline points={systolicPoints} fill="none" stroke="#e11d48" strokeWidth="1.5" />
        <polyline points={diastolicPoints} fill="none" stroke="#F5A623" strokeWidth="1.5" />
        {records.map((r, i) => (
          <g key={i}>
            <circle cx={i * step} cy={toY(r.systolic)} r="1.2" fill="#e11d48" />
            <circle cx={i * step} cy={toY(r.diastolic)} r="1.2" fill="#F5A623" />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-600" /> Systolic</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold-400" /> Diastolic</span>
      </div>
    </div>
  );
}
