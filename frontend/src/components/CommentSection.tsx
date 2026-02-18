import { useState, useEffect } from 'react';
import type { Comment, Activity } from '../types';
import { getComments, addComment, approveComment, rejectComment } from '../api/client';
import { DEPARTMENTS, STATUS_COLORS } from '../types';
import { format } from 'date-fns';

interface Props {
  activity: Activity;
}

const DEPT_COLORS: Record<string, string> = {
  Engineering:        'bg-blue-100 text-blue-800',
  Quality:            'bg-purple-100 text-purple-800',
  Procurement:        'bg-orange-100 text-orange-800',
  Manufacturing:      'bg-teal-100 text-teal-800',
  'Project Management':'bg-indigo-100 text-indigo-800',
  Design:             'bg-pink-100 text-pink-800',
  Testing:            'bg-yellow-100 text-yellow-800',
  'Supply Chain':     'bg-cyan-100 text-cyan-800',
  Finance:            'bg-green-100 text-green-800',
  Sales:              'bg-rose-100 text-rose-800',
};

export default function CommentSection({ activity }: Props) {
  const [comments, setComments]   = useState<Comment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [approverName, setApproverName] = useState('');
  const [form, setForm] = useState({
    author: '', department: DEPARTMENTS[0], content: '',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    getComments(activity.id)
      .then(setComments)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activity.id]);

  const handleSubmit = async () => {
    if (!form.author.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      await addComment(activity.id, form);
      setForm({ author: '', department: DEPARTMENTS[0], content: '' });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    if (!approverName.trim()) return;
    await approveComment(id, approverName);
    setApproving(null);
    setApproverName('');
    load();
  };

  const handleReject = async (id: number) => {
    await rejectComment(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{activity.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Comments are ingested into the RAG database upon approval.
          </p>
        </div>
        <button className="btn-primary text-xs py-1.5" onClick={() => setShowForm(!showForm)}>
          + Add Comment
        </button>
      </div>

      {/* Add comment form */}
      {showForm && (
        <div className="card p-4 mb-4 bg-blue-50 border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-3">New Comment (Draft)</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Your Name</label>
                <input className="input" value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="label text-xs">Department</label>
                <select className="input" value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label text-xs">Comment</label>
              <textarea className="input" rows={3}
                placeholder="Describe the issue, decision, or observation..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-xs py-1" disabled={saving} onClick={handleSubmit}>
                {saving ? 'Saving...' : 'Submit Draft'}
              </button>
              <button className="btn-secondary text-xs py-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-center text-gray-400 py-6">Loading comments...</p>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-2xl mb-2">💬</p>
          <p className="text-sm">No comments yet on this activity.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div
              key={c.id}
              className={`rounded-xl border p-4 ${
                c.status === 'approved' ? 'border-green-200 bg-green-50' :
                c.status === 'rejected' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{c.author}</span>
                    <span className={`badge text-xs ${DEPT_COLORS[c.department] || 'bg-gray-100 text-gray-600'}`}>
                      {c.department}
                    </span>
                    <span className={`badge text-xs ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>
                      {c.status}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy HH:mm') : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">{c.content}</p>
                  {c.approved_by && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Approved by {c.approved_by}
                      {c.approved_at ? ' · ' + format(new Date(c.approved_at), 'MMM d') : ''}
                    </p>
                  )}
                </div>

                {/* Actions for draft comments */}
                {c.status === 'draft' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      className="btn-success text-xs py-1 px-2"
                      onClick={() => { setApproving(c.id); setApproverName(''); }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-danger text-xs py-1 px-2"
                      onClick={() => handleReject(c.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Inline approver input */}
              {approving === c.id && (
                <div className="mt-3 pt-3 border-t border-green-200 flex gap-2 items-center">
                  <input
                    className="input flex-1 text-xs"
                    placeholder="Your name (approver)"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                  />
                  <button className="btn-success text-xs py-1" onClick={() => handleApprove(c.id)}>
                    Confirm
                  </button>
                  <button className="btn-secondary text-xs py-1" onClick={() => setApproving(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
