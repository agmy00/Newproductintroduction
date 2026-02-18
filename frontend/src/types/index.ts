export interface Project {
  id: number;
  name: string;
  description: string;
  project_type: string;
  status: string;
  created_by: string;
  created_at: string;
  phases?: Phase[];
  activity_count?: number;
}

export interface Phase {
  id: number;
  project_id?: number;
  name: string;
  order_index: number;
  status: 'pending' | 'active' | 'completed';
  gates?: PhaseGate[];
}

export interface PhaseGate {
  id: number;
  phase_id: number;
  name: string;
  description: string;
  required_approvers: string[];
  approvals: GateApproval[];
  status: 'pending' | 'approved' | 'rejected';
  is_blocking: boolean;
}

export interface GateApproval {
  user: string;
  department: string;
  approved_at: string;
}

export interface Activity {
  id: number;
  project_id: number;
  phase_id?: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  progress: number;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  parent_id?: number;
}

export interface Comment {
  id: number;
  activity_id: number;
  author: string;
  department: string;
  content: string;
  status: 'draft' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface Document {
  id: number;
  project_id: number;
  activity_id?: number;
  doc_type: 'mom' | 'po';
  filename: string;
  uploaded_by: string;
  created_at: string;
}

export interface Drawing {
  id: number;
  activity_id: number;
  sw_path: string;
  drawing_number: string;
  revision: string;
  description: string;
  created_at: string;
}

export interface Email {
  id: number;
  project_id: number;
  activity_id?: number;
  subject: string;
  sender: string;
  recipients: string[];
  body: string;
  email_date: string;
  linked_by: string;
  created_at: string;
}

export interface RAGResult {
  question: string;
  answer: string;
  sources: RAGSource[];
  source_count: number;
}

export interface RAGSource {
  id: number;
  source_type: string;
  content: string;
  meta: Record<string, string | number>;
  score: number;
}

export interface RAGStats {
  total_documents: number;
  by_type: Record<string, number>;
}

export const DEPARTMENTS = [
  'Engineering',
  'Quality',
  'Procurement',
  'Manufacturing',
  'Project Management',
  'Design',
  'Testing',
  'Supply Chain',
  'Finance',
  'Sales',
];

export const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  active:      'bg-blue-100 text-blue-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed:   'bg-green-100 text-green-800',
  approved:    'bg-green-100 text-green-800',
  rejected:    'bg-red-100 text-red-800',
  draft:       'bg-gray-100 text-gray-700',
};
