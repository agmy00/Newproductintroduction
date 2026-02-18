import { useState, useEffect } from 'react';
import type { Drawing, Activity } from '../types';
import { getDrawings, linkDrawing } from '../api/client';
import { format } from 'date-fns';

interface Props {
  activities: Activity[];
}

export default function DrawingLinks({ activities }: Props) {
  const [drawingsByActivity, setDrawingsByActivity] = useState<Record<number, Drawing[]>>({});
  const [selectedActivity, setSelectedActivity]     = useState<number | null>(
    activities.length > 0 ? activities[0].id : null
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sw_path: '', drawing_number: '', revision: 'A', description: '',
  });
  const [saving, setSaving] = useState(false);

  const loadDrawings = async (actId: number) => {
    const drawings = await getDrawings(actId);
    setDrawingsByActivity(prev => ({ ...prev, [actId]: drawings }));
  };

  useEffect(() => {
    if (selectedActivity) loadDrawings(selectedActivity);
  }, [selectedActivity]);

  const handleLink = async () => {
    if (!selectedActivity || !form.sw_path.trim()) return;
    setSaving(true);
    try {
      await linkDrawing(selectedActivity, form);
      setForm({ sw_path: '', drawing_number: '', revision: 'A', description: '' });
      setShowForm(false);
      loadDrawings(selectedActivity);
    } finally { setSaving(false); }
  };

  const currentDrawings = selectedActivity ? (drawingsByActivity[selectedActivity] || []) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Engineering Drawings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Link SolidWorks drawing references to project activities.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          + Link Drawing
        </button>
      </div>

      {/* Activity selector */}
      <div>
        <label className="label text-xs">Select Activity</label>
        <select
          className="input max-w-sm"
          value={selectedActivity ?? ''}
          onChange={e => { setSelectedActivity(Number(e.target.value)); setShowForm(false); }}
        >
          {activities.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Add drawing form */}
      {showForm && selectedActivity && (
        <div className="card p-5 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-4">Link SolidWorks Drawing</h3>
          <div className="space-y-3">
            <div>
              <label className="label text-xs">SolidWorks File Path / Reference *</label>
              <input
                className="input font-mono text-sm"
                placeholder="\\\\server\\Engineering\\Hull-5\\AC_Unit_v2.SLDPRT"
                value={form.sw_path}
                onChange={e => setForm({ ...form, sw_path: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the UNC path, PDM vault path, or drawing identifier.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Drawing Number</label>
                <input className="input" placeholder="DWG-2024-001"
                  value={form.drawing_number}
                  onChange={e => setForm({ ...form, drawing_number: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Revision</label>
                <select className="input" value={form.revision}
                  onChange={e => setForm({ ...form, revision: e.target.value })}>
                  {['A','B','C','D','E','F','G','H','1','2','3'].map(r =>
                    <option key={r} value={r}>{r}</option>
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="label text-xs">Description</label>
              <textarea className="input" rows={2} placeholder="What does this drawing cover?"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-xs py-1" disabled={saving} onClick={handleLink}>
                {saving ? 'Linking...' : 'Link Drawing'}
              </button>
              <button className="btn-secondary text-xs py-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawings list */}
      {selectedActivity && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <span>🗂️</span>
            <span className="font-medium text-sm text-gray-700">
              Linked Drawings ({currentDrawings.length})
            </span>
          </div>
          {currentDrawings.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400">
              <p className="text-3xl mb-2">📐</p>
              <p className="text-sm">No drawings linked to this activity yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {currentDrawings.map(d => (
                <div key={d.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {d.drawing_number && (
                          <span className="font-mono text-sm font-semibold text-blue-600">
                            {d.drawing_number}
                          </span>
                        )}
                        <span className="badge bg-gray-100 text-gray-600">Rev {d.revision}</span>
                      </div>
                      <p className="font-mono text-xs text-gray-500 mt-1 break-all">{d.sw_path}</p>
                      {d.description && (
                        <p className="text-sm text-gray-600 mt-1">{d.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Linked {d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        className="btn-secondary text-xs py-1"
                        onClick={() => navigator.clipboard.writeText(d.sw_path).then(() => alert('Path copied!'))}
                      >
                        Copy Path
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
