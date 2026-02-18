import { useState, useEffect } from 'react';
import type { Email } from '../types';
import { getEmails, linkEmail } from '../api/client';
import { format } from 'date-fns';

interface Props {
  projectId: number;
}

export default function EmailLinks({ projectId }: Props) {
  const [emails, setEmails]     = useState<Email[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing]   = useState<Email | null>(null);
  const [form, setForm] = useState({
    subject: '', sender: '', recipients: '', body: '',
    email_date: new Date().toISOString().slice(0, 10), linked_by: '',
  });
  const [saving, setSaving] = useState(false);

  const load = () =>
    getEmails(projectId)
      .then(setEmails)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const handleLink = async () => {
    if (!form.subject.trim() || !form.sender.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      await linkEmail(projectId, {
        ...form,
        recipients: form.recipients.split(',').map(r => r.trim()).filter(Boolean),
      });
      setForm({ subject: '', sender: '', recipients: '', body: '', email_date: new Date().toISOString().slice(0, 10), linked_by: '' });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Linked Emails</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Link Outlook emails related to this project. Email content is ingested into the RAG database.
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          + Link Email
        </button>
      </div>

      {/* Link email form */}
      {showForm && (
        <div className="card p-5 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-4">Link Outlook Email</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Subject *</label>
                <input className="input" placeholder="Re: A/C Unit specification change"
                  value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Date</label>
                <input className="input" type="date" value={form.email_date}
                  onChange={e => setForm({ ...form, email_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">From *</label>
                <input className="input" placeholder="john.smith@company.com"
                  value={form.sender} onChange={e => setForm({ ...form, sender: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">To (comma separated)</label>
                <input className="input" placeholder="jane.doe@company.com, team@company.com"
                  value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label text-xs">Email Body *</label>
              <textarea className="input font-mono text-xs leading-relaxed" rows={8}
                placeholder="Paste the full email body here..."
                value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">Linked By</label>
              <input className="input" placeholder="Your name" value={form.linked_by}
                onChange={e => setForm({ ...form, linked_by: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-xs py-1" disabled={saving} onClick={handleLink}>
                {saving ? 'Linking...' : 'Link & Ingest'}
              </button>
              <button className="btn-secondary text-xs py-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Email viewer modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{viewing.subject}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  From: {viewing.sender} ·
                  To: {(viewing.recipients || []).join(', ')} ·
                  {viewing.email_date}
                </p>
              </div>
              <button className="btn-secondary text-xs py-1 ml-4" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {viewing.body}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <p className="text-center text-gray-400 py-6">Loading emails...</p>
      ) : emails.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">✉️</p>
          <p className="font-medium">No emails linked yet</p>
          <p className="text-sm mt-1">Link Outlook emails to preserve decision context.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 overflow-hidden">
          {emails.map(e => (
            <div
              key={e.id}
              className="px-5 py-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4 group"
              onClick={() => setViewing(e)}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                {e.sender.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-sm text-gray-900 group-hover:text-blue-600 truncate">
                    {e.subject}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{e.email_date}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  From: {e.sender}
                  {e.recipients?.length > 0 && ` · To: ${e.recipients.slice(0, 2).join(', ')}${e.recipients.length > 2 ? '...' : ''}`}
                </p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{e.body}</p>
              </div>
              <span className="text-gray-300 group-hover:text-blue-500 flex-shrink-0">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
