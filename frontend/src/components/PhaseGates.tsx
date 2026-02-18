import { useState } from 'react';
import type { Phase, PhaseGate } from '../types';
import { createGate, approveGate, updatePhaseStatus } from '../api/client';
import { DEPARTMENTS } from '../types';

interface Props {
  phases: Phase[];
  onRefresh: () => void;
}

export default function PhaseGates({ phases, onRefresh }: Props) {
  const [addingGatePhase, setAddingGatePhase] = useState<number | null>(null);
  const [approvingGate, setApprovingGate]     = useState<number | null>(null);
  const [gateForm, setGateForm] = useState({
    name: '', description: '', required_approvers: [] as string[], is_blocking: true,
  });
  const [approvalForm, setApprovalForm] = useState({ user: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleCreateGate = async (phaseId: number) => {
    if (!gateForm.name.trim()) { setError('Gate name is required.'); return; }
    setSaving(true);
    try {
      await createGate(phaseId, gateForm);
      setAddingGatePhase(null);
      setGateForm({ name: '', description: '', required_approvers: [], is_blocking: true });
      onRefresh();
    } catch { setError('Failed to create gate.'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (gateId: number) => {
    if (!approvalForm.user || !approvalForm.department) {
      setError('User and department are required.'); return;
    }
    setSaving(true);
    try {
      await approveGate(gateId, approvalForm);
      setApprovingGate(null);
      setApprovalForm({ user: '', department: '' });
      onRefresh();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to approve gate.';
      setError(msg);
    } finally { setSaving(false); }
  };

  const handlePhaseStatus = async (phaseId: number, status: string) => {
    try {
      await updatePhaseStatus(phaseId, status);
      onRefresh();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot update phase.';
      alert(msg);
    }
  };

  const toggleApprover = (dept: string) => {
    setGateForm(f => ({
      ...f,
      required_approvers: f.required_approvers.includes(dept)
        ? f.required_approvers.filter(d => d !== dept)
        : [...f.required_approvers, dept],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Phase Gate Management</h2>
        <p className="text-sm text-gray-400">Gates block phase completion until all required approvals are received.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {phases.map(phase => {
        const allGatesApproved = (phase.gates || []).every(
          g => !g.is_blocking || g.status === 'approved'
        );
        return (
          <div key={phase.id} className="card overflow-hidden">
            {/* Phase header */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              phase.status === 'completed' ? 'bg-green-50 border-b border-green-100' :
              phase.status === 'active'    ? 'bg-blue-50 border-b border-blue-100' :
              'bg-gray-50 border-b border-gray-100'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  phase.status === 'completed' ? 'bg-green-500' :
                  phase.status === 'active'    ? 'bg-blue-500' : 'bg-gray-400'
                }`} />
                <span className="font-medium text-gray-900">{phase.name}</span>
                <span className={`badge ${
                  phase.status === 'completed' ? 'bg-green-100 text-green-700' :
                  phase.status === 'active'    ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {phase.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {phase.status === 'pending' && (
                  <button
                    className="btn-secondary text-xs py-1"
                    onClick={() => handlePhaseStatus(phase.id, 'active')}
                  >
                    Set Active
                  </button>
                )}
                {phase.status === 'active' && (
                  <button
                    className={`text-xs py-1 ${allGatesApproved ? 'btn-success' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                    disabled={!allGatesApproved}
                    onClick={() => allGatesApproved && handlePhaseStatus(phase.id, 'completed')}
                    title={!allGatesApproved ? 'All blocking gates must be approved first' : ''}
                  >
                    {allGatesApproved ? 'Complete Phase' : 'Gates Pending'}
                  </button>
                )}
                <button
                  className="btn-secondary text-xs py-1"
                  onClick={() => { setAddingGatePhase(phase.id); setError(''); }}
                >
                  + Add Gate
                </button>
              </div>
            </div>

            {/* Gate list */}
            <div className="divide-y divide-gray-50">
              {(phase.gates || []).length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 italic">No gates defined for this phase.</p>
              ) : (
                (phase.gates || []).map(gate => (
                  <GateRow
                    key={gate.id}
                    gate={gate}
                    onApprove={() => { setApprovingGate(gate.id); setError(''); }}
                  />
                ))
              )}
            </div>

            {/* Add gate form */}
            {addingGatePhase === phase.id && (
              <div className="px-5 py-4 bg-blue-50 border-t border-blue-100">
                <p className="font-medium text-sm text-blue-900 mb-3">New Phase Gate</p>
                <div className="space-y-3">
                  <input className="input" placeholder="Gate name *" value={gateForm.name}
                    onChange={e => setGateForm({ ...gateForm, name: e.target.value })} />
                  <textarea className="input" placeholder="Description" value={gateForm.description}
                    onChange={e => setGateForm({ ...gateForm, description: e.target.value })} rows={2} />
                  <div>
                    <label className="label text-xs">Required Approvers (departments)</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DEPARTMENTS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleApprover(d)}
                          className={`px-2 py-1 rounded text-xs border transition-colors ${
                            gateForm.required_approvers.includes(d)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={gateForm.is_blocking}
                      onChange={e => setGateForm({ ...gateForm, is_blocking: e.target.checked })} />
                    Blocking gate (prevents phase completion)
                  </label>
                  <div className="flex gap-2">
                    <button className="btn-primary text-xs py-1" disabled={saving}
                      onClick={() => handleCreateGate(phase.id)}>
                      {saving ? 'Saving...' : 'Create Gate'}
                    </button>
                    <button className="btn-secondary text-xs py-1" onClick={() => setAddingGatePhase(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Approve gate form */}
            {approvingGate !== null && (phase.gates || []).some(g => g.id === approvingGate) && (
              <div className="px-5 py-4 bg-green-50 border-t border-green-100">
                <p className="font-medium text-sm text-green-900 mb-3">Submit Approval</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Your Name</label>
                    <input className="input" value={approvalForm.user}
                      onChange={e => setApprovalForm({ ...approvalForm, user: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs">Department</label>
                    <select className="input" value={approvalForm.department}
                      onChange={e => setApprovalForm({ ...approvalForm, department: e.target.value })}>
                      <option value="">Select...</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn-success text-xs py-1" disabled={saving}
                    onClick={() => handleApprove(approvingGate!)}>
                    {saving ? 'Submitting...' : 'Submit Approval'}
                  </button>
                  <button className="btn-secondary text-xs py-1" onClick={() => setApprovingGate(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GateRow({ gate, onApprove }: { gate: PhaseGate; onApprove: () => void }) {
  const approvedDepts  = new Set((gate.approvals || []).map(a => a.department));
  const requiredDepts  = new Set(gate.required_approvers || []);
  const pendingDepts   = [...requiredDepts].filter(d => !approvedDepts.has(d));
  const pct = requiredDepts.size > 0 ? Math.round((approvedDepts.size / requiredDepts.size) * 100) : 100;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              gate.status === 'approved' ? 'bg-green-500' : gate.is_blocking ? 'bg-red-400' : 'bg-yellow-400'
            }`} />
            <span className="font-medium text-sm text-gray-800">{gate.name}</span>
            {gate.is_blocking && (
              <span className="badge bg-red-50 text-red-600 text-xs">Blocking</span>
            )}
            <span className={`badge text-xs ${
              gate.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {gate.status}
            </span>
          </div>
          {gate.description && <p className="text-xs text-gray-400 mt-1 ml-4">{gate.description}</p>}

          {/* Progress bar */}
          {requiredDepts.size > 0 && (
            <div className="mt-2 ml-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500">{gate.approvals?.length}/{requiredDepts.size}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[...requiredDepts].map(d => (
                  <span key={d} className={`badge text-xs ${
                    approvedDepts.has(d) ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {approvedDepts.has(d) ? '✓' : '○'} {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Approved by */}
          {(gate.approvals || []).length > 0 && (
            <div className="mt-2 ml-4 space-y-0.5">
              {gate.approvals.map((a, i) => (
                <p key={i} className="text-xs text-gray-400">
                  ✓ {a.user} ({a.department}) — {new Date(a.approved_at).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}
        </div>

        {gate.status !== 'approved' && pendingDepts.length > 0 && (
          <button className="btn-success text-xs py-1 flex-shrink-0" onClick={onApprove}>
            Approve
          </button>
        )}
      </div>
    </div>
  );
}
