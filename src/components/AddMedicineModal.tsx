import { useState } from 'react';
import { Pill } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { toISODate, calcNextDue } from '@/lib/helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  membershipId: string;
  onSaved: () => void;
}

const commonMedicines = [
  'Telmisartan 40mg',
  'Amlodipine 5mg',
  'Atorvastatin 10mg',
  'Metformin 500mg',
  'Glimepiride 2mg',
  'Aspirin 75mg',
  'Rosuvastatin 10mg',
  'Losartan 50mg',
  'Enalapril 5mg',
  'Insulin',
];

export function AddMedicineModal({ open, onClose, customerId, membershipId, onSaved }: Props) {
  const [form, setForm] = useState({
    medicine_name: '',
    quantity: '30',
    unit: 'tablet',
    days_of_medicine: '30',
    purchase_date: toISODate(new Date()),
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicine_name.trim()) {
      showToast('Medicine name is required', 'error');
      return;
    }
    setSaving(true);
    const days = parseInt(form.days_of_medicine, 10) || 30;
    const { error } = await supabase.from('medicine_purchases').insert({
      customer_id: customerId,
      membership_id: membershipId,
      medicine_name: form.medicine_name.trim(),
      quantity: parseFloat(form.quantity) || 1,
      unit: form.unit,
      days_of_medicine: days,
      purchase_date: form.purchase_date,
      next_due_date: calcNextDue(form.purchase_date, days),
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Medicine purchase recorded', 'success');
    setForm({ medicine_name: '', quantity: '30', unit: 'tablet', days_of_medicine: '30', purchase_date: toISODate(new Date()), notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Medicine Purchase" subtitle={`Member: ${membershipId}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-pharmos-50 p-3">
          <Pill size={20} className="text-pharmos-600" />
          <p className="text-xs text-pharmos-700">Record each medicine the customer purchased today. Next due date is auto-calculated from days of medicine.</p>
        </div>

        <div>
          <label className="label">Medicine Name *</label>
          <input
            className="input"
            value={form.medicine_name}
            onChange={e => update('medicine_name', e.target.value)}
            placeholder="e.g. Telmisartan 40mg"
            list="common-meds"
            required
          />
          <datalist id="common-meds">
            {commonMedicines.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Quantity</label>
            <input type="number" min="1" className="input" value={form.quantity} onChange={e => update('quantity', e.target.value)} />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => update('unit', e.target.value)}>
              <option value="tablet">tablet</option>
              <option value="capsule">capsule</option>
              <option value="bottle">bottle</option>
              <option value="strip">strip</option>
              <option value="box">box</option>
              <option value="ml">ml</option>
              <option value="unit">unit</option>
            </select>
          </div>
          <div>
            <label className="label">Days of Medicine</label>
            <input type="number" min="1" className="input" value={form.days_of_medicine} onChange={e => update('days_of_medicine', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Purchase Date</label>
          <input type="date" className="input" value={form.purchase_date} onChange={e => update('purchase_date', e.target.value)} />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any notes" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Record Purchase'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
