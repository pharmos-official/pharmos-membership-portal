import { useState, useRef } from 'react';
import {
  FileText, Image as ImageIcon, FilePlus2, Download, Eye, Trash2, X,
  StickyNote, Loader2, UploadCloud, FolderOpen, AlertCircle, Pencil,
  Video, Lock,
} from 'lucide-react';
import { usePortalData } from '@/customer/usePortalData';
import { useCustomerAuth } from '@/lib/customer-auth';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import { formatDate } from '@/lib/helpers';
import { MEMBER_DOCUMENT_CATEGORIES, type MemberDocument } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  'Prescriptions': 'bg-pharmos-50 text-pharmos-700',
  'Diagnosis': 'bg-rose-50 text-rose-700',
  'Blood Reports': 'bg-gold-50 text-gold-700',
  'ECG Reports': 'bg-emerald-50 text-emerald-700',
  'Other Documents': 'bg-slate-100 text-slate-600',
  'Notes': 'bg-purple-50 text-purple-700',
};

function getFileCategory(fileType: string | null): 'image' | 'pdf' | 'video' | 'other' {
  if (fileType?.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf' || fileType?.includes('pdf')) return 'pdf';
  if (fileType?.startsWith('video/')) return 'video';
  return 'other';
}

function getFileIcon(doc: MemberDocument): typeof FileText {
  const cat = getFileCategory(doc.file_type);
  if (cat === 'image') return ImageIcon;
  if (cat === 'video') return Video;
  if (doc.category === 'Notes' || !doc.file_path) return StickyNote;
  return FileText;
}

export function CustomerPrime() {
  const { data, loading, reload } = usePortalData();
  const { customerId, sessionToken } = useCustomerAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<MemberDocument | null>(null);
  const [editForm, setEditForm] = useState({ category: '', title: '', description: '', document_date: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'video' | 'other'>('other');
  const [confirmDelete, setConfirmDelete] = useState<MemberDocument | null>(null);

  // Upload form state
  const [form, setForm] = useState({
    category: 'Prescriptions',
    title: '',
    description: '',
    document_date: new Date().toISOString().split('T')[0],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPrime = !!data?.membership?.prime_enabled;
  const documents = data?.member_documents ?? [];
  const filtered = selectedCategory === 'all'
    ? documents
    : documents.filter(d => d.category === selectedCategory);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      </div>
    );
  }

  if (!isPrime) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-50">
            <FilePlus2 size={32} className="text-gold-500" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-slate-800">Pharmos Prime</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pharmos Prime gives you your own personal health document storage. Upload prescriptions, reports, images, and more — all in one secure place.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-600">
            Please contact PHARMOS to upgrade to Pharmos Prime.
          </p>
        </div>
      </div>
    );
  }

  const openUpload = () => {
    setForm({ category: 'Prescriptions', title: '', description: '', document_date: new Date().toISOString().split('T')[0] });
    setSelectedFile(null);
    setUploadOpen(true);
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !sessionToken) return;
    if (!form.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    setUploading(true);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        filePath = `${customerId}/${Date.now()}-${selectedFile.name}`;
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

      const { data: docId, error } = await supabase.rpc('create_member_document', {
        p_customer_id: customerId,
        p_session_token: sessionToken,
        p_category: form.category,
        p_title: form.title.trim(),
        p_description: form.description.trim() || null,
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath,
        p_document_date: form.document_date,
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
        showToast('Unable to save document. Please check your membership.', 'error');
        if (filePath) {
          await supabase.storage.from('member-documents').remove([filePath]);
        }
        setUploading(false);
        return;
      }

      showToast('Document saved successfully', 'success');
      setUploadOpen(false);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
    setUploading(false);
  };

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

  const openEdit = (doc: MemberDocument) => {
    setEditingDoc(doc);
    setEditForm({
      category: doc.category,
      title: doc.title,
      description: doc.description ?? '',
      document_date: doc.document_date,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDoc || !customerId || !sessionToken) return;
    if (!editForm.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    setSavingEdit(true);
    const { data: ok, error } = await supabase.rpc('update_member_document', {
      p_customer_id: customerId,
      p_session_token: sessionToken,
      p_document_id: editingDoc.id,
      p_category: editForm.category,
      p_title: editForm.title.trim(),
      p_description: editForm.description.trim() || null,
      p_document_date: editForm.document_date,
    });
    setSavingEdit(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    if (!ok) {
      showToast('Unable to update document', 'error');
      return;
    }
    showToast('Document updated successfully', 'success');
    setEditingDoc(null);
    await reload();
  };

  const handleDelete = async () => {
    if (!confirmDelete || !customerId || !sessionToken) return;
    const { data: ok, error } = await supabase.rpc('delete_member_document', {
      p_customer_id: customerId,
      p_session_token: sessionToken,
      p_document_id: confirmDelete.id,
    });
    if (error) {
      showToast(error.message, 'error');
      setConfirmDelete(null);
      return;
    }
    if (!ok) {
      showToast('Unable to delete document', 'error');
      setConfirmDelete(null);
      return;
    }
    // Remove file from storage if it exists (handled server-side too, keep for safety)
    if (confirmDelete.file_path) {
      await supabase.storage.from('member-documents').remove([confirmDelete.file_path]).catch(() => {});
    }
    showToast('Document deleted', 'success');
    setConfirmDelete(null);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
            <FilePlus2 size={20} className="text-gold-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">Pharmos Prime</h1>
            <p className="mt-0.5 text-sm text-slate-500">Your personal health document storage</p>
          </div>
        </div>
        <button onClick={openUpload} className="btn-gold">
          <UploadCloud size={18} /> Upload Document
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${selectedCategory === 'all' ? 'bg-pharmos-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All ({documents.length})
        </button>
        {MEMBER_DOCUMENT_CATEGORIES.map(cat => {
          const count = documents.filter(d => d.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${selectedCategory === cat ? 'bg-pharmos-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <FolderOpen size={40} className="mx-auto text-slate-300" />
          <h2 className="mt-4 font-display text-lg font-bold text-slate-700">No documents yet</h2>
          <p className="mt-1 text-sm text-slate-500">Upload your first prescription, report, or note to get started.</p>
          <button onClick={openUpload} className="btn-primary mt-5">
            <UploadCloud size={18} /> Upload Your First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(doc => {
            const Icon = getFileIcon(doc);
            const isNote = doc.category === 'Notes' || !doc.file_path;
            return (
              <div key={doc.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${CATEGORY_COLORS[doc.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    <Icon size={20} />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {doc.category}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-800">{doc.title}</h3>
                {doc.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{doc.description}</p>}
                {!isNote && doc.file_name && (
                  <p className="mt-1 truncate text-[11px] text-slate-400">{doc.file_name}</p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {formatDate(doc.document_date)}
                    {doc.uploaded_by === 'admin' && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500" title="Uploaded by PHARMOS Admin — read only">
                        <Lock size={9} /> Read-only
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {isNote && !doc.file_path && (
                      <span className="rounded-md bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-600">Note</span>
                    )}
                    {!isNote && (
                      <>
                        <button onClick={() => viewDoc(doc)} className="rounded-lg p-1.5 text-pharmos-600 hover:bg-pharmos-50" title="View">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => downloadDoc(doc)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Download">
                          <Download size={15} />
                        </button>
                      </>
                    )}
                    {doc.uploaded_by === 'member' ? (
                      <>
                        <button onClick={() => openEdit(doc)} className="rounded-lg p-1.5 text-pharmos-600 hover:bg-pharmos-50" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(doc)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Admin</span>
                    )}
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
                <p className="text-xs text-slate-500">Save your health document securely</p>
              </div>
              <button onClick={() => setUploadOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 p-5">
              <div>
                <label className="label">Document Category *</label>
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {MEMBER_DOCUMENT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Blood Report — August 2026"
                  required
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.document_date}
                  onChange={e => setForm({ ...form, document_date: e.target.value })}
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
                      <p className="text-xs text-slate-400">JPG, PNG, PDF, MP4, MOV, AVI supported</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.avi,.webm,image/jpeg,image/png,application/pdf,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                    className="hidden"
                    onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Description / Notes (optional)</label>
                <textarea
                  className="input min-h-[70px] resize-y"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Any notes or description about this document"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setUploadOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={uploading} className="btn-primary">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : 'Save Document'}
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
            <div className="max-h-[75vh] overflow-auto bg-slate-100">
              {previewType === 'image' && <img src={previewUrl} alt={previewName} className="mx-auto max-w-full" />}
              {previewType === 'pdf' && <iframe src={previewUrl} title={previewName} className="h-[70vh] w-full" />}
              {previewType === 'video' && (
                <video src={previewUrl} controls className="mx-auto max-h-[70vh] w-full bg-black" />
              )}
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

      {/* Edit modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setEditingDoc(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800">Edit Document</h2>
                <p className="text-xs text-slate-500">Update your document details</p>
              </div>
              <button onClick={() => setEditingDoc(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="label">Document Category *</label>
                <select className="input" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                  {MEMBER_DOCUMENT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="e.g. Blood Report — August 2026"
                  required
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={editForm.document_date}
                  onChange={e => setEditForm({ ...editForm, document_date: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Description / Notes (optional)</label>
                <textarea
                  className="input min-h-[70px] resize-y"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Any notes or description about this document"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingDoc(null)} className="btn-ghost">Cancel</button>
                <button type="button" onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary">
                  {savingEdit ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
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
              <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}