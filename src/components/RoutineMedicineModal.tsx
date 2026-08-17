import { useEffect, useState } from 'react';
import { Pill, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  membershipId: string;
  onSaved: () => void;
}

interface Row {
  id: number;
  medicine_name: string;
  quantity: string;
  unit: string;
  total_amount: string;
  notes: string;
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

const units = ['tablet', 'capsule', 'bottle', 'strip', 'box', 'ml', 'unit'];

let nextId = 1;

function emptyRow(): Row {
  return { id: nextId++, medicine_name: '', quantity: '30', unit: 'tablet', total_amount: '', notes: '' };
}

export function RoutineMedicineModal({ open, onClose, customerId, membershipId, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [grandTotal, setGrandTotal] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset rows each time the modal opens
  useEffect(() => {
    if (open) {
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      setGrandTotal('');
      setSaving(false);
    }
  }, [open]);

  const updateRow = (id: number, field: keyof Row, value: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows(prev => [...prev, emptyRow()]);
  };

  const removeRow = (id: number) => {
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.medicine_name.trim());
    if (validRows.length === 0) {
      showToast('Add at least one medicine name', 'error');
      return;
    }
    setSaving(true);
    const inserts = validRows.map(r => ({
      customer_id: customerId,
      membership_id: membershipId,
      medicine_name: r.medicine_name.trim(),
      quantity: parseFloat(r.quantity) || 1,
      unit: r.unit,
      total_amount: r.total_amount.trim() ? parseFloat(r.total_amount) : null,
      notes: r.notes.trim() || null,
    }));
    const { error } = await supabase.from('routine_medicines').insert(inserts);
    if (error) {
      setSaving(false);
      showToast(error.message, 'error');
      return;
    }
    const { error: totalError } = await supabase.from('routine_medicine_totals').insert({
      customer_id: customerId,
      membership_id: membershipId,
      total_amount: grandTotal.trim() ? parseFloat(grandTotal) : null,
    });
    setSaving(false);
    if (totalError) {
      showToast(totalError.message, 'error');
      return;
    }
    showToast(`${inserts.length} routine medicine${inserts.length > 1 ? 's' : ''} saved`, 'success');
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Routine Medicine" subtitle={`Member: ${membershipId}`} size="xl">
      <div className="flex items-center gap-3 rounded-lg bg-pharmos-50 p-3">
        <Pill size={20} className="text-pharmos-600" />
        <p className="text-xs text-pharmos-700">
          Fill multiple routine medicines in one window and save them all together. These appear only under the Routine Medicine tab.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2 font-semibold">Medicine Name</th>
              <th className="w-24 px-2 py-2 text-right font-semibold">Quantity</th>
              <th className="w-28 px-2 py-2 font-semibold">Unit</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">Total Amount</th>
              <th className="px-2 py-2 font-semibold">Note</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-2 py-2">
                  <input
                    className="input py-2"
                    value={row.medicine_name}
                    onChange={e => updateRow(row.id, 'medicine_name', e.target.value)}
                    placeholder="e.g. Telmisartan 40mg"
                    list="routine-common-meds"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="1"
                    className="input py-2 text-right"
                    value={row.quantity}
                    onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    className="input py-2"
                    value={row.unit}
                    onChange={e => updateRow(row.id, 'unit', e.target.value)}
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
                    value={row.total_amount}
                    onChange={e => updateRow(row.id, 'total_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="input py-2"
                    value={row.notes}
                    onChange={e => updateRow(row.id, 'notes', e.target.value)}
                    placeholder="e.g. BP, Sugar"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="routine-common-meds">
          {commonMedicines.map(m => <option key={m} value={m} />)}
        </datalist>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-pharmos-300 px-3 py-2 text-sm font-semibold text-pharmos-600 transition-colors hover:bg-pharmos-50"
      >
        <Plus size={16} /> Add Medicine
      </button>

      <div className="mt-3">
        <div className="w-44">
          <label className="label">Total Amount of Medicines</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input py-2 pl-7 text-right"
              value={grandTotal}
              onChange={e => setGrandTotal(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">{rows.filter(r => r.medicine_name.trim()).length} medicine(s) ready to save</p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>
    </Modal>
  );
}