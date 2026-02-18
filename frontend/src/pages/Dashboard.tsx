import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../api/client';
import type { Project } from '../types';
import { STATUS_COLORS } from '../types';
import { format } from 'date-fns';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     projects.length,
    active:    projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">New Product Introduction Management System</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/projects/new')}>
          + New NPI Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Projects', value: stats.total,     color: 'blue'  },
          { label: 'Active',         value: stats.active,    color: 'green' },
          { label: 'Completed',      value: stats.completed, color: 'gray'  },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">All Projects</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-600 font-medium">No projects yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first NPI project to get started.</p>
            <button className="btn-primary mt-4" onClick={() => navigate('/projects/new')}>
              Create First Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                  <span className={`badge ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {p.project_type}
                  </span>
                  <span className={`badge ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {p.created_at ? format(new Date(p.created_at), 'MMM d, yyyy') : ''}
                  </span>
                  <span className="text-gray-300 group-hover:text-blue-500 transition-colors">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
