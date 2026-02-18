import { useState, useEffect, useRef } from 'react';
import type { Document } from '../types';
import { getDocuments, uploadDocument, getDocumentViewUrl } from '../api/client';
import { format } from 'date-fns';

interface Props {
  projectId: number;
}

export default function DocumentUpload({ projectId }: Props) {
  const [documents, setDocuments]   = useState<Document[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [docType, setDocType]       = useState<'mom' | 'po'>('mom');
  const [uploader, setUploader]     = useState('');
  const [error, setError]           = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    getDocuments(projectId)
      .then(setDocuments)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a file.'); return; }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setError('Only PDF, DOC, and DOCX files are supported.'); return;
    }

    const fd = new FormData();
    fd.append('project_id', String(projectId));
    fd.append('doc_type', docType);
    fd.append('uploaded_by', uploader || 'Unknown');
    fd.append('file', file);

    setUploading(true);
    setError('');
    try {
      await uploadDocument(fd);
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = '';
      setUploader('');
      load();
    } catch { setError('Upload failed. Make sure the backend is running.'); }
    finally { setUploading(false); }
  };

  const moms = documents.filter(d => d.doc_type === 'mom');
  const pos  = documents.filter(d => d.doc_type === 'po');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">Uploaded documents are extracted and ingested into the RAG knowledge base.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => { setShowForm(!showForm); setError(''); }}>
          + Upload Document
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="card p-5 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-4">Upload Document</h3>
          <div className="space-y-3">
            <div>
              <label className="label text-xs">Document Type</label>
              <div className="flex gap-2 mt-1">
                {(['mom', 'po'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDocType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      docType === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {t === 'mom' ? '📋 Minutes of Meeting' : '🧾 Purchase Order'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label text-xs">Uploaded By</label>
              <input className="input" value={uploader} placeholder="Your name"
                onChange={e => setUploader(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">File (PDF, DOC, DOCX)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                           file:rounded-lg file:border-0 file:text-sm file:font-medium
                           file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary text-xs py-1.5" disabled={uploading} onClick={handleUpload}>
                {uploading ? 'Uploading...' : 'Upload & Ingest'}
              </button>
              <button className="btn-secondary text-xs py-1.5" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">{viewingDoc.filename}</p>
                <p className="text-xs text-gray-400">
                  {viewingDoc.doc_type === 'mom' ? 'Minutes of Meeting' : 'Purchase Order'} ·
                  Uploaded by {viewingDoc.uploaded_by}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={getDocumentViewUrl(viewingDoc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1"
                >
                  Open in tab
                </a>
                <button className="btn-secondary text-xs py-1" onClick={() => setViewingDoc(null)}>
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              {viewingDoc.filename.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getDocumentViewUrl(viewingDoc.id)}
                  className="w-full h-full rounded-lg border"
                  title={viewingDoc.filename}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-6xl mb-4">📄</p>
                    <p className="font-medium text-gray-700">{viewingDoc.filename}</p>
                    <p className="text-sm text-gray-400 mt-1">Word documents cannot be previewed in browser.</p>
                    <a
                      href={getDocumentViewUrl(viewingDoc.id)}
                      download
                      className="btn-primary mt-4"
                    >
                      Download to View
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-6">Loading documents...</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* MoM */}
          <DocSection
            title="Minutes of Meeting"
            icon="📋"
            color="blue"
            docs={moms}
            onView={setViewingDoc}
          />
          {/* PO */}
          <DocSection
            title="Purchase Orders"
            icon="🧾"
            color="orange"
            docs={pos}
            onView={setViewingDoc}
          />
        </div>
      )}
    </div>
  );
}

function DocSection({
  title, icon, color, docs, onView,
}: {
  title: string;
  icon: string;
  color: string;
  docs: Document[];
  onView: (d: Document) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className={`px-4 py-3 bg-${color}-50 border-b border-${color}-100 flex items-center gap-2`}>
        <span>{icon}</span>
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <span className="ml-auto badge bg-white text-gray-500 border border-gray-200">{docs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {docs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No {title.toLowerCase()} uploaded yet.</p>
        ) : (
          docs.map(d => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{d.filename}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {d.uploaded_by && `by ${d.uploaded_by} · `}
                  {d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <button
                className="btn-secondary text-xs py-1 px-2 ml-3 flex-shrink-0"
                onClick={() => onView(d)}
              >
                View
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
