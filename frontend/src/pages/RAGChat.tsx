import { useState, useEffect, useRef } from 'react';
import { getProjects, ragQuery, ragReconstruct, ragStats, ragReindex } from '../api/client';
import type { Project, RAGStats } from '../types';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mode?: 'query' | 'reconstruct';
  timestamp: Date;
}

export default function RAGChat() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);
  const [mode, setMode]           = useState<'query' | 'reconstruct'>('query');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [stats, setStats]         = useState<RAGStats | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProjects().then(setProjects);
    ragStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const EXAMPLE_QUERIES = [
    'Why did we change the A/C unit on Hull 5?',
    'What supplier was selected for the thermal coating?',
    'Who approved the design change in Phase 2?',
    'What were the issues found during prototype validation?',
    'Show me all decisions related to the cooling system.',
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input, mode, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let answer = '';
      if (mode === 'query') {
        const result = await ragQuery(input, selectedProject);
        answer = result.answer;
      } else {
        const result = await ragReconstruct(input, selectedProject);
        answer = result.reconstruction;
      }

      const assistantMsg: Message = {
        role: 'assistant', content: answer, mode, timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Refresh stats
      ragStats().then(setStats).catch(() => {});
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to get a response. Make sure the backend is running.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await ragReindex();
      const s = await ragStats();
      setStats(s);
    } finally { setReindexing(false); }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">◈</span> AI Knowledge Assistant
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            RAG-powered retrieval across all project data.
          </p>
        </div>

        {/* Mode selector */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mode</p>
          <div className="space-y-2">
            <button
              onClick={() => setMode('query')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                mode === 'query'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium block">RAG Query</span>
              <span className="text-xs opacity-70">Find specific information</span>
            </button>
            <button
              onClick={() => setMode('reconstruct')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                mode === 'reconstruct'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium block">Context Reconstruction</span>
              <span className="text-xs opacity-70">Reconstruct full decision story</span>
            </button>
          </div>
        </div>

        {/* Project filter */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Project</p>
          <select
            className="input text-sm"
            value={selectedProject ?? ''}
            onChange={e => setSelectedProject(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Knowledge base stats */}
        {stats && (
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Knowledge Base
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Documents</span>
                <span className="font-semibold text-gray-900">{stats.total_documents}</span>
              </div>
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs text-gray-500">
                  <span className="capitalize">{type === 'mom' ? 'MoM' : type === 'po' ? 'PO' : type}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
            <button
              className="btn-secondary text-xs py-1 w-full mt-3"
              disabled={reindexing}
              onClick={handleReindex}
            >
              {reindexing ? 'Re-indexing...' : '↺ Re-index'}
            </button>
          </div>
        )}

        {/* Example queries */}
        <div className="px-4 py-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Example Questions</p>
          <div className="space-y-1.5">
            {EXAMPLE_QUERIES.map(q => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="w-full text-left text-xs text-gray-600 hover:text-blue-600
                           px-2 py-1.5 rounded hover:bg-blue-50 transition-colors leading-snug"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <p className="text-5xl mb-4">◈</p>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Ask anything about your projects
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  The AI assistant searches across approved comments, meeting minutes,
                  purchase orders, and linked emails to answer your questions.
                </p>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-left">
                  <p className="text-xs font-semibold text-blue-700 mb-2">TRY ASKING:</p>
                  <p className="text-sm text-blue-800 italic">
                    "Why did we change the A/C unit on Hull 5?"
                  </p>
                </div>
                <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100 text-left">
                  <p className="text-xs font-semibold text-purple-700 mb-2">CONTEXT RECONSTRUCTION:</p>
                  <p className="text-sm text-purple-800 italic">
                    "Reconstruct the full story of the cooling system decision"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0 mt-1">
                    ◈
                  </div>
                )}
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.mode === 'reconstruct'
                      ? 'bg-white border border-purple-200 shadow-sm'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.role === 'assistant' && msg.mode && (
                      <span className={`ml-2 badge ${msg.mode === 'reconstruct' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {msg.mode === 'reconstruct' ? 'Reconstruction' : 'RAG Query'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0">
                ◈
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-5">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className={`flex items-end gap-3 p-3 rounded-xl border-2 transition-colors ${
            mode === 'reconstruct' ? 'border-purple-300 focus-within:border-purple-500' : 'border-gray-300 focus-within:border-blue-500'
          } bg-white`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${mode === 'reconstruct' ? 'text-purple-600' : 'text-blue-600'}`}>
                  {mode === 'query' ? '⚡ RAG Query' : '🔮 Context Reconstruction'}
                </span>
                {selectedProject && (
                  <span className="text-xs text-gray-400">
                    · {projects.find(p => p.id === selectedProject)?.name}
                  </span>
                )}
              </div>
              <textarea
                className="w-full text-sm text-gray-800 resize-none outline-none leading-relaxed"
                rows={2}
                placeholder={
                  mode === 'query'
                    ? 'Ask a question about your projects...'
                    : 'Enter a topic to reconstruct its full decision history...'
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'reconstruct'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '...' : '↑'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line ·
            RAG searches: comments, MoM, POs, and linked emails
          </p>
        </div>
      </div>
    </div>
  );
}
