import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { toISODate } from '@/lib/helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onSaved: () => void;
}

export function AddBpModal({ open, onClose, customerId, onSaved }: Props) {
  const [form, setForm] = useState({
    systolic: '',
    diastolic: '',
    pulse: '',
    checkup_date: toISODate(new Date()),
    checkup_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sys = parseInt(form.systolic, 10);
    const dia = parseInt(form.diastolic, 10);
    if (!sys || !dia) {
      showToast('Systolic and diastolic values are required', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('bp_records').insert({
      customer_id: customerId,
      checkup_date: form.checkup_date,
      checkup_time: form.checkup_time + ':00',
      systolic: sys,
      diastolic: dia,
      pulse: form.pulse ? parseInt(form.pulse, 10) : null,
      reading_text: `${sys}/${dia} mmHg`,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('BP reading saved', 'success');
    setForm({ systolic: '', diastolic: '', pulse: '', checkup_date: toISODate(new Date()), checkup_time: new Date().toTimeString().slice(0, 5), notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="BP Checkup" subtitle="Record blood pressure reading">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-rose-50 p-3">
          <HeartPulse size={20} className="text-rose-600" />
          <p className="text-xs text-rose-700">Enter the BP values as shown on the monitor.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Systolic *</label>
            <input type="number" className="input" value={form.systolic} onChange={e => update('systolic', e.target.value)} placeholder="120" required />
          </div>
          <div>
            <label className="label">Diastolic *</label>
            <input type="number" className="input" value={form.diastolic} onChange={e => update('diastolic', e.target.value)} placeholder="80" required />
          </div>
          <div>
            <label className="label">Pulse</label>
            <input type="number" className="input" value={form.pulse} onChange={e => update('pulse', e.target.value)} placeholder="76" />
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
          <input className="input" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="e.g. After medication" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Reading'}</button>
        </div>
      </form>
    </Modal>
  );
}
