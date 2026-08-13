import { useState } from 'react';
import { Droplet } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import type { SugarTestType } from '@/types';
import { toISODate } from '@/lib/helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onSaved: () => void;
}

const testTypes: { value: SugarTestType; label: string; defaultUnit: string; placeholder: string }[] = [
  { value: 'Fasting', label: 'Fasting Blood Sugar', defaultUnit: 'mg/dL', placeholder: '98' },
  { value: 'PP', label: 'PP Blood Sugar', defaultUnit: 'mg/dL', placeholder: '135' },
  { value: 'RBS', label: 'Random Blood Sugar', defaultUnit: 'mg/dL', placeholder: '120' },
  { value: 'HbA1c', label: 'HbA1c', defaultUnit: '%', placeholder: '6.2' },
];

export function AddSugarModal({ open, onClose, customerId, onSaved }: Props) {
  const [testType, setTestType] = useState<SugarTestType>('Fasting');
  const [form, setForm] = useState({
    reading: '',
    unit: 'mg/dL',
    checkup_date: toISODate(new Date()),
    checkup_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const selectType = (t: SugarTestType) => {
    setTestType(t);
    const td = testTypes.find(x => x.value === t)!;
    setForm(prev => ({ ...prev, unit: td.defaultUnit }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const reading = parseFloat(form.reading);
    if (isNaN(reading)) {
      showToast('Reading is required', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('sugar_records').insert({
      customer_id: customerId,
      checkup_date: form.checkup_date,
      checkup_time: form.checkup_time + ':00',
      test_type: testType,
      reading,
      unit: form.unit,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Sugar reading saved', 'success');
    setForm({ reading: '', unit: 'mg/dL', checkup_date: toISODate(new Date()), checkup_time: new Date().toTimeString().slice(0, 5), notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Sugar Checkup" subtitle="Record blood sugar reading">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-3">
          <Droplet size={20} className="text-amber-600" />
          <p className="text-xs text-amber-700">Select the test type and enter the reading.</p>
        </div>

        <div>
          <label className="label">Test Type</label>
          <div className="grid grid-cols-2 gap-2">
            {testTypes.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => selectType(t.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all ${
                  testType === t.value
                    ? 'border-pharmos-500 bg-pharmos-50 text-pharmos-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Reading *</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.reading}
              onChange={e => update('reading', e.target.value)}
              placeholder={testTypes.find(t => t.value === testType)?.placeholder}
              required
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => update('unit', e.target.value)}>
              <option value="mg/dL">mg/dL</option>
              <option value="%">%</option>
              <option value="mmol/L">mmol/L</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.checkup_date} onChange={e => update('checkup_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={form.checkup_time} onChange={e => update('checkup_time', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any notes" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Reading'}</button>
        </div>
      </form>
    </Modal>
  );
}
