import axios from 'axios';
import type {
  Project, Phase, PhaseGate, Activity, Comment,
  Document, Drawing, Email, RAGResult, RAGStats,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Projects
export const getProjects = () => api.get<Project[]>('/projects').then(r => r.data);
export const getProject  = (id: number) => api.get<Project>(`/projects/${id}`).then(r => r.data);
export const createProject = (data: Partial<Project>) =>
  api.post('/projects', data).then(r => r.data);

// Phases
export const getPhases = (projectId: number) =>
  api.get<Phase[]>(`/projects/${projectId}/phases`).then(r => r.data);
export const createPhase = (projectId: number, data: { name: string; order_index: number }) =>
  api.post(`/projects/${projectId}/phases`, data).then(r => r.data);
export const updatePhaseStatus = (phaseId: number, status: string) =>
  api.patch(`/phases/${phaseId}/status?status=${status}`).then(r => r.data);

// Phase Gates
export const getGates = (phaseId: number) =>
  api.get<PhaseGate[]>(`/phases/${phaseId}/gates`).then(r => r.data);
export const createGate = (phaseId: number, data: Partial<PhaseGate>) =>
  api.post(`/phases/${phaseId}/gates`, data).then(r => r.data);
export const approveGate = (gateId: number, data: { user: string; department: string }) =>
  api.post(`/gates/${gateId}/approve`, data).then(r => r.data);

// Activities
export const getActivities = (projectId: number) =>
  api.get<Activity[]>(`/projects/${projectId}/activities`).then(r => r.data);
export const createActivity = (data: Partial<Activity>) =>
  api.post('/activities', data).then(r => r.data);
export const updateActivity = (id: number, data: Partial<Activity>) =>
  api.patch(`/activities/${id}`, data).then(r => r.data);

// Comments
export const getComments = (activityId: number) =>
  api.get<Comment[]>(`/activities/${activityId}/comments`).then(r => r.data);
export const addComment = (activityId: number, data: Partial<Comment>) =>
  api.post(`/activities/${activityId}/comments`, data).then(r => r.data);
export const approveComment = (commentId: number, approved_by: string) =>
  api.patch(`/comments/${commentId}/approve`, { approved_by }).then(r => r.data);
export const rejectComment = (commentId: number) =>
  api.patch(`/comments/${commentId}/reject`).then(r => r.data);

// Documents
export const getDocuments = (projectId: number) =>
  api.get<Document[]>(`/projects/${projectId}/documents`).then(r => r.data);
export const uploadDocument = (formData: FormData) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
export const getDocumentViewUrl = (docId: number) => `/api/documents/${docId}/view`;

// Drawings
export const getDrawings = (activityId: number) =>
  api.get<Drawing[]>(`/activities/${activityId}/drawings`).then(r => r.data);
export const linkDrawing = (activityId: number, data: Partial<Drawing>) =>
  api.post(`/activities/${activityId}/drawings`, data).then(r => r.data);

// Emails
export const getEmails = (projectId: number) =>
  api.get<Email[]>(`/projects/${projectId}/emails`).then(r => r.data);
export const linkEmail = (projectId: number, data: Partial<Email>) =>
  api.post(`/projects/${projectId}/emails`, data).then(r => r.data);

// RAG
export const ragQuery = (question: string, projectId?: number) =>
  api.post<RAGResult>('/rag/query', { question, project_id: projectId, top_k: 5 }).then(r => r.data);
export const ragReconstruct = (topic: string, projectId?: number) =>
  api.post<{ topic: string; reconstruction: string }>(
    '/rag/reconstruct', { question: topic, project_id: projectId }
  ).then(r => r.data);
export const ragStats = () => api.get<RAGStats>('/rag/stats').then(r => r.data);
export const ragReindex = () => api.post('/rag/reindex').then(r => r.data);
