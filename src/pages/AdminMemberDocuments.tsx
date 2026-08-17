import { useState, useEffect, useCallback, useRef } from 'react';
import { FilePlus2, Download, Eye, Trash2, X, Loader2, AlertCircle, FileText, Image as ImageIcon, StickyNote, UploadCloud } from 'lucide-react';
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
  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: 'Prescriptions', title: '', description: '', document_date: new Date().toISOString().split('T')[0] });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openUpload = () => {
    setUploadForm({ category: 'Prescriptions', title: '', description: '', document_date: new Date().toISOString().split('T')[0] });
    setSelectedFile(null);
    setUploadOpen(true);
  };

  const handleAdminUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    if (!uploadForm.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    setUploading(true);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      // Upload file if selected — admin files go under `<customerId>/admin/`
      if (selectedFile) {
        filePath = `${customerId}/admin/${Date.now()}-${selectedFile.name}`;
        const { error: upErr } = await supabase.storage
          .from('member-documents')
          .upload(filePath, selectedFile);
        if (upErr) {
          showToast(`Failed to upload file: ${upErr.message}`, 'error');
          setUploading(false);
          return;
        }
        fileName = selectedFile.name;
        fileType = selectedFile.type || '';
      }

      const { data: docId, error } = await supabase.rpc('admin_create_member_document', {
        p_admin_session_token: sessionToken,
        p_customer_id: customerId,
        p_category: uploadForm.category,
        p_title: uploadForm.title.trim(),
        p_description: uploadForm.description.trim() || null,
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath,
        p_document_date: uploadForm.document_date,
      });

      if (error) {
        showToast(error.message, 'error');
        if (filePath) {
          await supabase.storage.from('member-documents').remove([filePath]);
        }
        setUploading(false);
        return;
      }
      if (!docId) {
        showToast('Unable to save document', 'error');
        if (filePath) {
          await supabase.storage.from('member-documents').remove([filePath]);
        }
        setUploading(false);
        return;
      }

      showToast('Document uploaded successfully', 'success');
      setUploadOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
    setUploading(false);
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
        <button onClick={openUpload} className="btn-gold !px-3 !py-1.5 text-xs">
          <UploadCloud size={14} /> Upload
        </button>
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

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setUploadOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800">Upload Document</h2>
                <p className="text-xs text-slate-500">Upload as Admin — read-only for the customer</p>
              </div>
              <button onClick={() => setUploadOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdminUpload} className="space-y-4 p-5">
              <div>
                <label className="label">Document Category *</label>
                <select className="input" value={uploadForm.category} onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}>
                  {MEMBER_DOCUMENT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={uploadForm.title}
                  onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g. Blood Report — August 2026"
                  required
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={uploadForm.document_date}
                  onChange={e => setUploadForm({ ...uploadForm, document_date: e.target.value })}
                />
              </div>

              <div>
                <label className="label">File (JPG, PNG, PDF, MP4) — optional for Notes</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition-colors hover:border-pharmos-400 hover:bg-pharmos-50"
                >
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-pharmos-600" />
                      <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null); }} className="rounded p-1 text-red-500 hover:bg-red-50">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-slate-400" />
                      <p className="mt-2 text-sm font-medium text-slate-600">Click to choose a file</p>
                      <p className="text-xs text-slate-400">JPG, PNG, PDF, MP4 supported</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.avi,.webm,image/jpeg,image/png,application/pdf,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Description / Notes (optional)</label>
                <textarea
                  className="input min-h-[70px] resize-y"
                  value={uploadForm.description}
                  onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Any notes or description about this document"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setUploadOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={uploading} className="btn-primary">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
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