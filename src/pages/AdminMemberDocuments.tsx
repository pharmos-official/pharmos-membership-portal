import { useState, useEffect, useCallback } from 'react';
import { FilePlus2, Download, Eye, Trash2, X, Loader2, AlertCircle, FileText, Image as ImageIcon, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/admin-auth';
import { showToast } from '@/components/Toast';
import { formatDate } from '@/lib/helpers';
import { MEMBER_DOCUMENT_CATEGORIES, type MemberDocument } from '@/types';

interface Props {
  customerId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Prescriptions': 'bg-pharmos-50 text-pharmos-700',
  'Diagnosis': 'bg-rose-50 text-rose-700',
  'Blood Reports': 'bg-gold-50 text-gold-700',
  'ECG Reports': 'bg-emerald-50 text-emerald-700',
  'Other Documents': 'bg-slate-100 text-slate-600',
  'Notes': 'bg-purple-50 text-purple-700',
};

function getFileCategory(fileType: string | null): 'image' | 'pdf' | 'other' {
  if (fileType?.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf' || fileType?.includes('pdf')) return 'pdf';
  return 'other';
}

export function AdminMemberDocuments({ customerId }: Props) {
  const { sessionToken } = useAdminAuth();
  const [docs, setDocs] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('other');
  const [confirmDelete, setConfirmDelete] = useState<MemberDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('member_documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setDocs((data ?? []) as MemberDocument[]);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const viewDoc = async (doc: MemberDocument) => {
    if (!doc.file_path) return;
    const { data: urlData, error } = await supabase.storage
      .from('member-documents')
      .createSignedUrl(doc.file_path, 3600);
    if (error || !urlData?.signedUrl) {
      showToast('Unable to open file', 'error');
      return;
    }
    setPreviewUrl(urlData.signedUrl);
    setPreviewName(doc.file_name ?? doc.title);
    setPreviewType(getFileCategory(doc.file_type));
  };

  const downloadDoc = async (doc: MemberDocument) => {
    if (!doc.file_path) return;
    const { data: urlData, error } = await supabase.storage
      .from('member-documents')
      .createSignedUrl(doc.file_path, 3600);
    if (error || !urlData?.signedUrl) return;
    const a = window.document.createElement('a');
    a.href = urlData.signedUrl;
    a.download = doc.file_name ?? doc.title;
    a.click();
  };

  const handleDelete = async () => {
    if (!confirmDelete || !sessionToken) return;
    setDeleting(true);
    // Admin deletes directly from the table (admin has full access)
    const { error } = await supabase
      .from('member_documents')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      showToast(error.message, 'error');
      setDeleting(false);
      setConfirmDelete(null);
      return;
    }
    if (confirmDelete.file_path) {
      await supabase.storage.from('member-documents').remove([confirmDelete.file_path]).catch(() => {});
    }
    showToast('Document deleted', 'success');
    setDeleting(false);
    setConfirmDelete(null);
    await load();
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilePlus2 size={18} className="text-gold-600" />
          <h3 className="text-sm font-bold text-slate-800">Pharmos Prime Documents ({docs.length})</h3>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <FilePlus2 size={28} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-slate-400">No member documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {docs.map(doc => {
            const isNote = doc.category === 'Notes' || !doc.file_path;
            const Icon = isNote ? StickyNote : getFileCategory(doc.file_type) === 'image' ? ImageIcon : FileText;
            return (
              <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${CATEGORY_COLORS[doc.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    <Icon size={16} />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {doc.category}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-slate-800">{doc.title}</h4>
                {doc.description && <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{doc.description}</p>}
                {!isNote && doc.file_name && <p className="mt-0.5 truncate text-[11px] text-slate-400">{doc.file_name}</p>}
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[11px] text-slate-400">
                    {formatDate(doc.document_date)} · {doc.uploaded_by === 'admin' ? 'Admin' : 'Member'}
                  </span>
                  <div className="flex items-center gap-1">
                    {!isNote && (
                      <>
                        <button onClick={() => viewDoc(doc)} className="rounded-lg p-1.5 text-pharmos-600 hover:bg-pharmos-50" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => downloadDoc(doc)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Download">
                          <Download size={14} />
                        </button>
                      </>
                    )}
                    <button onClick={() => setConfirmDelete(doc)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
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
              {previewType === 'other' && (
                <div className="p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">Preview not available.</p>
                  <a href={previewUrl} download className="btn-primary mt-4">Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h2 className="mt-4 text-center font-display text-lg font-bold text-slate-800">Delete Document?</h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              "{confirmDelete.title}" will be permanently deleted. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
                {deleting ? <><Loader2 size={16} className="animate-spin" /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}