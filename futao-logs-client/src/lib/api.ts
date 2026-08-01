import type { Diary, DiaryListInput, DiaryListResult, DiaryUpsertInput, TimelineResult, CalendarResult, Tag, FileUploadResult, GraphData, GraphEntity } from './types';

const API_BASE = '/api/trpc';

async function tRPCQuery<T>(path: string, input: unknown): Promise<T> {
  const encoded = encodeURIComponent(JSON.stringify(input));
  const res = await fetch(`${API_BASE}/${path}?input=${encoded}`);
  if (!res.ok) throw new Error(`tRPC error: ${res.status}`);
  const json = await res.json();
  return json.result?.data as T;
}

async function tRPCMutation<T>(path: string, input: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`tRPC mutation error: ${res.status}`);
  const json = await res.json();
  return json.result?.data as T;
}

export const api = {
  // ── Diary ──
  diaryList: (input: DiaryListInput = {}) =>
    tRPCQuery<DiaryListResult>('diary.list', input),

  diaryDetail: (id: number) =>
    tRPCQuery<Diary | null>('diary.detail', { id }),

  diaryUpsert: (input: DiaryUpsertInput) =>
    tRPCMutation<Diary>('diary.upsert', input),

  diaryDelete: (ids: number[]) =>
    tRPCMutation<{ success: boolean }>('diary.delete', { ids }),

  diaryCalendar: (year: number, month: number) =>
    tRPCQuery<CalendarResult>('diary.calendar', { year, month }),

  diaryTimeline: (page = 1, size = 10, tagId?: number | null) =>
    tRPCQuery<TimelineResult>('diary.timeline', { page, size, tagId }),

  diaryOnThisDay: (month: number, day: number) =>
    tRPCQuery<{ id: number; year: number; preview: string } | null>('diary.onThisDay', { month, day }),

  // ── Tag ──
  tagList: () =>
    tRPCQuery<Tag[]>('tag.list', {}),

  tagUpsert: (input: { id?: number; name: string; color?: string }) =>
    tRPCMutation<Tag>('tag.upsert', input),

  // ── Export ──
  exportMarkdown: (input: { ids?: number[]; bookId?: number } = {}) =>
    tRPCMutation<{ filePath: string; diaryCount: number }>('export.markdown', input),

  exportJson: (input: { ids?: number[] } = {}) =>
    tRPCMutation<{ filePath: string; diaryCount: number }>('export.json', input),

  // ── File ──
  uploadFile: async (file: File): Promise<FileUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/file/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  // ── Config ──
  configGet: (key: string) =>
    tRPCQuery<any>('config.get', { key }),

  configSet: (key: string, value: any) =>
    tRPCMutation<{ success: boolean }>('config.set', { key, value }),

  configGetAll: () =>
    tRPCQuery<Record<string, any>>('config.getAll', {}),

  // ── LLM ──
  llmTest: (input: { apiUrl: string; apiKey: string; model: string }) =>
    tRPCMutation<{ success: boolean; model?: string; latency?: number; error?: string }>('llm.test', input),

  llmChat: (messages: { role: string; content: string }[]) =>
    tRPCMutation<{ success: boolean; content?: string; error?: string }>('llm.chat', { messages }),

  llmModels: (input: { provider?: string; apiKey?: string; apiUrl?: string } = {}) =>
    tRPCQuery<{ models: { id: string; ownedBy: string }[]; error?: string }>('llm.models', input),

  llmSummarize: (input: { date?: string } = {}) =>
    tRPCMutation<{ summary: string; keywords: string[]; diaryCount: number; error?: string }>('llm.summarize', input),

  // ── Summary ──
  summaryGenerate: (input: { type: 'day' | 'week' | 'month' | 'year'; date?: string; feedback?: string }) =>
    tRPCMutation<{
      success: boolean;
      summary?: string;
      analysis?: { body?: string; mind?: string; psychology?: string; growth?: string };
      advice?: string;
      keywords?: string[];
      version?: number;
      periodKey?: string;
      error?: string;
    }>('summary.generate', input),

  summaryGet: (type: string, periodKey: string) =>
    tRPCQuery<{
      id: number; type: string; periodKey: string; content: string;
      analysis: string; advice: string; keywords: string; version: number;
      feedback: string; createdAt: string;
    } | null>('summary.get', { type, periodKey }),

  summaryList: (types?: string[]) =>
    tRPCQuery<{
      id: number; type: string; periodKey: string; content: string;
      analysis: string; advice: string; version: number; createdAt: string;
    }[]>('summary.list', types?.length ? { types } : {}),

  summaryDelete: (type: string, periodKey: string) =>
    tRPCMutation<{ success: boolean }>('summary.delete', { type, periodKey }),

  summaryUpdate: (input: { type: string; periodKey: string; content?: string; analysis?: string; advice?: string; keywords?: string }) =>
    tRPCMutation<{ success: boolean; error?: string }>('summary.update', input),

  // ── RAG / Semantic Search ──
  ragIndexAll: (force = false) =>
    tRPCMutation<{ success: boolean; total: number; indexed: number; errors: number; message?: string }>('rag.indexAll', { force }),

  ragIndexDiary: (diaryId: number) =>
    tRPCMutation<{ success: boolean; dimensions?: number; error?: string }>('rag.indexDiary', { diaryId }),

  ragSearch: (query: string, limit = 10, minScore = 0.5) =>
    tRPCQuery<{
      items: { diary: any; score: number }[];
      query: string;
      error?: string;
    }>('rag.search', { query, limit, minScore }),

  ragExtractEntities: (options: { diaryId?: number; diaryIds?: number[] } = {}) =>
    tRPCMutation<{ success: boolean; total: number; extracted: number; errors: number; message?: string }>('rag.extractEntities', options),

  // 全量重建图谱（林正树 task #22）：force=true 清空重建，异步执行立即返回
  ragRebuildGraph: (input: { force?: boolean } = { force: false }) =>
    tRPCMutation<{ success: boolean; started: boolean; total: number; error?: string }>('rag.rebuildGraph', input),

  // 图谱重建进度查询
  ragRebuildStatus: () =>
    tRPCQuery<{
      running: boolean;
      total: number;
      processed: number;
      current: string;
      stage: string;
      error?: string;
      startedAt?: string;
      finishedAt?: string;
    }>('rag.rebuildStatus', {}),

  ragGraph: (type?: string) =>
    tRPCQuery<{
      nodes: { id: number; type: string; name: string; diaryCount: number }[];
      edges: { source: number; target: number; weight: number; relation: string }[];
    }>('rag.graph', type ? { type } : {}),

  ragEntityDetail: (id: number) =>
    tRPCQuery<{
      entity: any;
      diaries: any[];
      relatedEntities: any[];
      relations: any[];
    } | null>('rag.entityDetail', { id }),

  // ── Export history ──
  exportHistory: () =>
    tRPCQuery<{ format: string; status: string; filePath: string; diaryCount: number; createdAt: string }[]>('export.history', {}),

  // ── Knowledge Base ──
  knowledgeList: (input: { page?: number; size?: number; source?: string; searchText?: string } = {}) =>
    tRPCQuery<{ items: any[]; total: number; page: number; size: number; totalPages: number }>('knowledge.list', input),

  knowledgeDetail: (id: number) =>
    tRPCQuery<any | null>('knowledge.detail', { id }),

  // ⑥ 知识库批量删除（林正树后端已支持 {ids}）：传 number 用单条 {id}，传数组用批量 {ids}
  knowledgeDelete: (id: number | number[]) =>
    tRPCMutation<{ success: boolean }>('knowledge.delete', Array.isArray(id) ? { ids: id } : { id }),

  knowledgeUpdate: (input: { id: number; content?: string; tags?: string }) =>
    tRPCMutation<{ success: boolean }>('knowledge.update', input),

  treeholeSummarizeSession: (sessionId: number) =>
    tRPCMutation<{ success: boolean; summary?: string; error?: string }>('treehole.summarizeSession', { sessionId }),

  // ── Treehole ──
  treeholeSessions: () =>
    tRPCQuery<{ id: number; title: string; updatedAt: string }[]>('treehole.sessions', {}),

  treeholeMessages: (sessionId: number) =>
    tRPCQuery<{ id: number; title: string; messages: { role: string; content: string }[] }>('treehole.messages', { sessionId }),

  treeholeAsk: (sessionId: number, content: string) =>
    tRPCMutation<{ success: boolean; reply?: string; error?: string }>('treehole.ask', { sessionId, content }),

  // 树洞状态轮询（林正树 #24）：thinking=AI 思考中 / saving=入库中 / summary 三态
  treeholeStatus: (sessionId: number) =>
    tRPCQuery<{
      thinking: boolean;
      saving: boolean;
      summary: { status: 'idle' | 'processing' | 'done' | 'error'; summary?: string; error?: string; startedAt?: string; finishedAt?: string };
    }>('treehole.status', { sessionId }),

  treeholeNewSession: () =>
    tRPCMutation<{ id: number; title: string }>('treehole.newSession', {}),

  // ⑥ 涟漪对话批量删除（林正树后端已支持 {ids}）：传 number 用单条 {sessionId}，传数组用批量 {ids}
  treeholeDeleteSession: (sessionId: number | number[]) =>
    tRPCMutation<{ success: boolean }>('treehole.deleteSession', Array.isArray(sessionId) ? { ids: sessionId } : { sessionId }),

  treeholeSaveToKnowledgeBase: (input: { sessionId?: number; messageIndex?: number; content?: string }) =>
    tRPCMutation<{ success: boolean; message?: string; error?: string }>('treehole.saveToKnowledgeBase', input),
};
