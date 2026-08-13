import { useState, useRef } from 'react';
import { HeartPulse, Upload, FileText, Image as ImageIcon, Video, X, Loader2 } from 'lucide-react';
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

interface UploadedFile {
  file: File;
  path: string;
  preview: string;
  type: 'image' | 'pdf' | 'video' | 'other';
}

function fileType(filename: string): UploadedFile['type'] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'other';
}

export function AddEcgModal({ open, onClose, customerId, onSaved }: Props) {
  const [form, setForm] = useState({
    result: '',
    notes: '',
    checkup_date: toISODate(new Date()),
    checkup_time: new Date().toTimeString().slice(0, 5),
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleFileSelect = async (selected: FileList | null) => {
    if (!selected) return;
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(selected)) {
      const path = `${customerId}/${Date.now()}-${file.name}`;
      newFiles.push({
        file,
        path,
        preview: file.type.startsWith('image') ? URL.createObjectURL(file) : '',
        type: fileType(file.name),
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: ecg, error: ecgErr } = await supabase.from('ecg_records').insert({
        customer_id: customerId,
        checkup_date: form.checkup_date,
        checkup_time: form.checkup_time + ':00',
        result: form.result.trim() || null,
        notes: form.notes.trim() || null,
      }).select().single();

      if (ecgErr || !ecg) {
        showToast(ecgErr?.message ?? 'Failed to save ECG', 'error');
        setSaving(false);
        return;
      }

      // Upload files
      for (const uf of files) {
        const { error: upErr } = await supabase.storage
          .from('ecg-attachments')
          .upload(uf.path, uf.file);
        if (upErr) {
          showToast(`Failed to upload ${uf.file.name}: ${upErr.message}`, 'error');
          continue;
        }
        await supabase.from('ecg_attachments').insert({
          ecg_record_id: ecg.id,
          file_name: uf.file.name,
          file_type: uf.file.type || uf.type,
          file_path: uf.path,
        });
      }

      showToast('ECG checkup saved', 'success');
      setForm({ result: '', notes: '', checkup_date: toISODate(new Date()), checkup_time: new Date().toTimeString().slice(0, 5) });
      setFiles([]);
      onSaved();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="ECG Checkup" subtitle="Record ECG result and upload files" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-pharmos-50 p-3">
          <HeartPulse size={20} className="text-pharmos-600" />
          <p className="text-xs text-pharmos-700">Upload ECG images, PDF reports, or videos. Files are stored securely.</p>
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
          <label className="label">ECG Result</label>
          <input className="input" value={form.result} onChange={e => update('result', e.target.value)} placeholder="e.g. Normal ECG" />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input min-h-[60px] resize-y" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional observations" />
        </div>

        <div>
          <label className="label">Attachments (Images, PDFs, Videos)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition-colors hover:border-pharmos-400 hover:bg-pharmos-50"
          >
            <Upload size={24} className="text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600">Click to upload files</p>
            <p className="text-xs text-slate-400">Images, PDFs, and videos supported</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,video/*"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-100">
                    {f.type === 'image' && f.preview ? (
                      <img src={f.preview} alt="" className="h-full w-full rounded object-cover" />
                    ) : f.type === 'pdf' ? (
                      <FileText size={18} className="text-red-500" />
                    ) : f.type === 'video' ? (
                      <Video size={18} className="text-pharmos-500" />
                    ) : (
                      <ImageIcon size={18} className="text-slate-400" />
                    )}
                  </div>
                  <p className="flex-1 truncate text-xs font-medium text-slate-700">{f.file.name}</p>
                  <button type="button" onClick={() => removeFile(i)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save ECG'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
