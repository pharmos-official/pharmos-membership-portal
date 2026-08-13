import { useState } from 'react';
import { Stethoscope, FileText, Image as ImageIcon, Video, Download, Eye, X } from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { useCustomerAuth } from '@/lib/customer-auth';
import { supabase } from '@/lib/supabase';
import { formatDate, formatTime } from '@/lib/helpers';
import type { EcgAttachment } from '@/types';

export function CustomerEcg() {
  const { data, loading } = usePortalData();
  const { sessionToken } = useCustomerAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'video' | 'other'>('other');

  if (loading || !data) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
  }

  const records = data.ecg_records;

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('video/')) return Video;
    if (fileType === 'application/pdf') return FileText;
    return FileText;
  };

  const getFileCategory = (fileType: string): 'image' | 'pdf' | 'video' | 'other' => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.startsWith('video/')) return 'video';
    return 'other';
  };

  const viewAttachment = async (att: EcgAttachment) => {
    if (!sessionToken) return;
    const category = getFileCategory(att.file_type);
    const { data: urlData, error } = await supabase.storage
      .from('ecg-attachments')
      .createSignedUrl(att.file_path, 3600);
    if (error || !urlData?.signedUrl) return;
    setPreviewUrl(urlData.signedUrl);
    setPreviewName(att.file_name);
    setPreviewType(category);
  };

  const downloadAttachment = async (att: EcgAttachment) => {
    const { data: urlData, error } = await supabase.storage
      .from('ecg-attachments')
      .createSignedUrl(att.file_path, 3600);
    if (error || !urlData?.signedUrl) return;
    const a = window.document.createElement('a');
    a.href = urlData.signedUrl;
    a.download = att.file_name;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pharmos-50">
          <Stethoscope size={20} className="text-pharmos-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">ECG History</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your ECG checkup records and reports</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card p-12 text-center">
          <Stethoscope size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No ECG records yet. Visit PHARMOS for a checkup.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pharmos-50">
                    <Stethoscope size={22} className="text-pharmos-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{formatDate(r.checkup_date)} · {formatTime(r.checkup_time)}</p>
                    {r.result && <p className="mt-0.5 text-sm text-slate-600">{r.result}</p>}
                  </div>
                </div>
              </div>
              {r.notes && <p className="mt-3 text-xs text-slate-500">{r.notes}</p>}

              {r.ecg_attachments && r.ecg_attachments.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Reports & Files</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {r.ecg_attachments.map(att => {
                      const Icon = getFileIcon(att.file_type);
                      return (
                        <div key={att.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                            <Icon size={18} className="text-slate-500" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-slate-700">{att.file_name}</p>
                            <p className="text-[11px] text-slate-400">{att.file_type}</p>
                          </div>
                          <button
                            onClick={() => viewAttachment(att)}
                            className="rounded-lg p-1.5 text-pharmos-600 transition-colors hover:bg-pharmos-50"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => downloadAttachment(att)}
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-h-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-800">{previewName}</p>
              <button onClick={() => setPreviewUrl(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto">
              {previewType === 'image' && <img src={previewUrl} alt={previewName} className="mx-auto max-w-full" />}
              {previewType === 'pdf' && <iframe src={previewUrl} title={previewName} className="h-[70vh] w-full" />}
              {previewType === 'video' && <video src={previewUrl} controls className="mx-auto max-w-full" />}
              {previewType === 'other' && (
                <div className="p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">Preview not available for this file type.</p>
                  <a href={previewUrl} download={previewName} className="btn-primary mt-4">Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">ECG reports are uploaded by PHARMOS staff. Only you can view your own reports.</p>
    </div>
  );
}
