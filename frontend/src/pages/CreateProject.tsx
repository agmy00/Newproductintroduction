import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/client';

const NPI_PHASES = [
  { name: 'Concept & Feasibility',  desc: 'Market research, concept definition, feasibility analysis' },
  { name: 'Design & Development',   desc: 'Product design, engineering drawings, BOM creation' },
  { name: 'Prototype & Validation', desc: 'Build prototypes, run tests, validate against requirements' },
  { name: 'Pilot Production',        desc: 'Small-scale production run, process validation, quality audit' },
  { name: 'Mass Production',         desc: 'Full-scale production release, handoff to manufacturing' },
];

export default function CreateProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    project_type: 'NPI',
    created_by: 'Project Manager',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setLoading(true);
    try {
      const result = await createProject(form);
      navigate(`/projects/${result.id}`);
    } catch {
      setError('Failed to create project. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New NPI Project</h1>
      <p className="text-gray-500 text-sm mb-8">Set up a New Product Introduction project with phase gates and activities.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project details */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 border-b pb-3">Project Details</h2>

          <div>
            <label className="label">Project Name *</label>
            <input
              className="input"
              placeholder="e.g. Hull-5 A/C Unit Redesign"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Brief description of the NPI project..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project Type</label>
              <select
                className="input"
                value={form.project_type}
                onChange={e => setForm({ ...form, project_type: e.target.value })}
              >
                <option value="NPI">NPI – New Product Introduction</option>
                <option value="ECO">ECO – Engineering Change Order</option>
                <option value="CR">CR – Change Request</option>
              </select>
            </div>
            <div>
              <label className="label">Created By</label>
              <input
                className="input"
                value={form.created_by}
                onChange={e => setForm({ ...form, created_by: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Default phases */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 border-b pb-3 mb-4">
            Default NPI Phases <span className="text-xs font-normal text-gray-400 ml-2">(auto-created)</span>
          </h2>
          <div className="space-y-2">
            {NPI_PHASES.map((ph, i) => (
              <div key={ph.name} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-blue-900">{ph.name}</p>
                  <p className="text-xs text-blue-600 mt-0.5">{ph.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            You can add or modify phases and phase gates after project creation.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
