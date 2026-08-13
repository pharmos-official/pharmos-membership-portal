import { useState, useMemo } from 'react';
import { Pill, ChevronDown, CalendarClock } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { formatDate, groupByMonth, monthLabel, monthKey } from '@/lib/helpers';

export function CustomerMedicines() {
  const { data, loading } = usePortalData();

  const allMonths = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const p of data.medicine_purchases) {
      set.add(monthKey(p.purchase_date));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const purchases = data.medicine_purchases;
  const filtered = selectedMonth === 'all'
    ? purchases
    : purchases.filter(p => monthKey(p.purchase_date) === selectedMonth);

  const grouped = groupByMonth(filtered, 'purchase_date');

  const monthLabelStr = (key: string) => {
    const [y, m] = key.split('-');
    return monthLabel(parseInt(y), parseInt(m) - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
            <Pill size={20} className="text-pharmos-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">My Medicines</h1>
            <p className="mt-0.5 text-sm text-slate-500">Complete medicine purchase history</p>
          </div>
        </div>

        {/* Month filter */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <CalendarClock size={16} className="text-slate-400" />
            {selectedMonth === 'all' ? 'All Months' : monthLabelStr(selectedMonth)}
            <ChevronDown size={16} className="text-slate-400" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => { setSelectedMonth('all'); setDropdownOpen(false); }}
                  className={`flex w-full items-center px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 ${selectedMonth === 'all' ? 'text-pharmos-700' : 'text-slate-600'}`}
                >
                  All Months
                </button>
                <div className="my-1 border-t border-slate-100" />
                {allMonths.map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(m); setDropdownOpen(false); }}
                    className={`flex w-full items-center px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 ${selectedMonth === m ? 'text-pharmos-700' : 'text-slate-600'}`}
                  >
                    {monthLabelStr(m)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Pill size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No medicine purchases found for this period.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([key, items]) => (
            <div key={key}>
              <h2 className="mb-3 font-display text-lg font-bold text-slate-800">{monthLabelStr(key)}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(p => (
                  <div key={p.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
                        <Pill size={18} className="text-pharmos-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-400">{formatDate(p.purchase_date)}</span>
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-800">{p.medicine_name}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Qty: <strong className="text-slate-700">{p.quantity} {p.unit}</strong></span>
                      <span>Days: <strong className="text-slate-700">{p.days_of_medicine}</strong></span>
                    </div>
                    {p.next_due_date && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gold-600">
                        <CalendarClock size={12} />
                        Next due: <strong>{formatDate(p.next_due_date)}</strong>
                      </div>
                    )}
                    {p.notes && <p className="mt-2 text-xs text-slate-400">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
