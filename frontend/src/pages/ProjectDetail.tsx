import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Project, Phase, Activity } from '../types';
import { getProject, getPhases, getActivities, createActivity, updateActivity } from '../api/client';
import { STATUS_COLORS } from '../types';
import GanttChart from '../components/GanttChart';
import PhaseGates from '../components/PhaseGates';
import CommentSection from '../components/CommentSection';
import DocumentUpload from '../components/DocumentUpload';
import DrawingLinks from '../components/DrawingLinks';
import EmailLinks from '../components/EmailLinks';
import { format } from 'date-fns';

const TABS = ['Overview', 'Phase Gates', 'Activities', 'Documents', 'Drawings', 'Emails'] as const;
type Tab = typeof TABS[number];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject]     = useState<Project | null>(null);
  const [phases, setPhases]       = useState<Phase[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tab, setTab]             = useState<Tab>('Overview');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading]     = useState(true);

  // Create activity form
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [actForm, setActForm] = useState({
    name: '', description: '', start_date: '', end_date: '',
    assignee: '', phase_id: '', status: 'pending',
  });
  const [savingAct, setSavingAct] = useState(false);

  const loadAll = async () => {
    try {
      const [proj, ph, acts] = await Promise.all([
        getProject(projectId),
        getPhases(projectId),
        getActivities(projectId),
      ]);
      setProject(proj);
      setPhases(ph);
      setActivities(acts);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [projectId]);

  const handleCreateActivity = async () => {
    if (!actForm.name || !actForm.start_date || !actForm.end_date) return;
    setSavingAct(true);
    try {
      await createActivity({
        project_id: projectId,
        phase_id: actForm.phase_id ? Number(actForm.phase_id) : undefined,
        name: actForm.name,
        description: actForm.description,
        start_date: actForm.start_date,
        end_date: actForm.end_date,
        assignee: actForm.assignee,
        status: actForm.status as Activity['status'],
      });
      setActForm({ name: '', description: '', start_date: '', end_date: '', assignee: '', phase_id: '', status: 'pending' });
      setShowNewActivity(false);
      loadAll();
    } finally { setSavingAct(false); }
  };

  const handleProgressUpdate = async (act: Activity, progress: number) => {
    await updateActivity(act.id, { progress });
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Project not found.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/dashboard')}>← Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
              ← Dashboard
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className="badge bg-blue-100 text-blue-700">{project.project_type}</span>
              <span className={`badge ${STATUS_COLORS[project.status] || 'bg-gray-100'}`}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Created by {project.created_by}
              {project.created_at ? ' · ' + format(new Date(project.created_at), 'MMM d, yyyy') : ''}
            </p>
          </div>

          {/* Phase progress */}
          <div className="hidden md:flex items-center gap-1">
            {phases.map((ph, i) => (
              <div key={ph.id} className="flex items-center gap-1">
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  ph.status === 'completed' ? 'bg-green-100 text-green-700' :
                  ph.status === 'active'    ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {ph.name.split(' ')[0]}
                </div>
                {i < phases.length - 1 && (
                  <span className={`text-sm ${ph.status === 'completed' ? 'text-green-400' : 'text-gray-300'}`}>›</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-5 border-b border-gray-100">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* OVERVIEW - Gantt chart */}
        {tab === 'Overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Project Gantt Chart</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> In Progress</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" /> Pending</span>
              </div>
            </div>
            <GanttChart activities={activities} phases={phases} />

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Total Activities', value: activities.length },
                { label: 'Completed',        value: activities.filter(a => a.status === 'completed').length },
                { label: 'In Progress',      value: activities.filter(a => a.status === 'in_progress').length },
                { label: 'Avg Progress',     value: activities.length > 0 ? Math.round(activities.reduce((s, a) => s + a.progress, 0) / activities.length) + '%' : '0%' },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE GATES */}
        {tab === 'Phase Gates' && (
          <PhaseGates phases={phases} onRefresh={loadAll} />
        )}

        {/* ACTIVITIES */}
        {tab === 'Activities' && (
          <div className="flex gap-6 h-full">
            {/* Activity list */}
            <div className="w-80 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Activities</h2>
                <button className="btn-primary text-xs py-1" onClick={() => setShowNewActivity(!showNewActivity)}>
                  + Add
                </button>
              </div>

              {/* New activity form */}
              {showNewActivity && (
                <div className="card p-4 bg-blue-50 border-blue-200">
                  <div className="space-y-2">
                    <input className="input text-xs" placeholder="Activity name *"
                      value={actForm.name} onChange={e => setActForm({ ...actForm, name: e.target.value })} />
                    <textarea className="input text-xs" rows={2} placeholder="Description"
                      value={actForm.description} onChange={e => setActForm({ ...actForm, description: e.target.value })} />
                    <select className="input text-xs" value={actForm.phase_id}
                      onChange={e => setActForm({ ...actForm, phase_id: e.target.value })}>
                      <option value="">No Phase</option>
                      {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Start Date</label>
                        <input className="input text-xs" type="date" value={actForm.start_date}
                          onChange={e => setActForm({ ...actForm, start_date: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">End Date</label>
                        <input className="input text-xs" type="date" value={actForm.end_date}
                          onChange={e => setActForm({ ...actForm, end_date: e.target.value })} />
                      </div>
                    </div>
                    <input className="input text-xs" placeholder="Assignee"
                      value={actForm.assignee} onChange={e => setActForm({ ...actForm, assignee: e.target.value })} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs py-1" disabled={savingAct} onClick={handleCreateActivity}>
                        {savingAct ? 'Saving...' : 'Create'}
                      </button>
                      <button className="btn-secondary text-xs py-1" onClick={() => setShowNewActivity(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity list */}
              <div className="space-y-2">
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No activities yet.</p>
                ) : (
                  activities.map(a => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedActivity(a)}
                      className={`card p-3 cursor-pointer hover:border-blue-300 transition-colors ${
                        selectedActivity?.id === a.id ? 'border-blue-400 ring-1 ring-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 leading-tight">{a.name}</p>
                        <span className={`badge text-xs flex-shrink-0 ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </div>
                      {a.assignee && <p className="text-xs text-gray-400 mt-1">{a.assignee}</p>}
                      <div className="mt-2">
                        <div className="flex items-center gap-1 mb-0.5">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${a.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{a.progress}%</span>
                        </div>
                      </div>
                      {/* Progress update slider */}
                      <input
                        type="range" min="0" max="100" step="10"
                        value={a.progress}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleProgressUpdate(a, Number(e.target.value))}
                        className="w-full h-1 mt-1 accent-blue-600 cursor-pointer"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comment section */}
            <div className="flex-1 card p-5">
              {selectedActivity ? (
                <CommentSection activity={selectedActivity} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm">Select an activity to view and add comments.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'Documents' && <DocumentUpload projectId={projectId} />}

        {/* DRAWINGS */}
        {tab === 'Drawings' && (
          activities.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">📐</p>
              <p>Add activities first, then you can link drawings to them.</p>
            </div>
          ) : (
            <DrawingLinks activities={activities} />
          )
        )}

        {/* EMAILS */}
        {tab === 'Emails' && <EmailLinks projectId={projectId} />}
      </div>
    </div>
  );
}
