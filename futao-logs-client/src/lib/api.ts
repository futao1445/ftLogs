import type { Diary, DiaryListInput, DiaryListResult, DiaryUpsertInput, TimelineResult, CalendarResult, Tag, FileUploadResult } from './types';

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

  diaryTimeline: (page = 1, size = 10) =>
    tRPCQuery<TimelineResult>('diary.timeline', { page, size }),

  // ── Tag ──
  tagList: () =>
    tRPCQuery<Tag[]>('tag.list', {}),

  tagUpsert: (input: { id?: number; name: string; color?: string }) =>
    tRPCMutation<Tag>('tag.upsert', input),

  // ── File ──
  uploadFile: async (file: File): Promise<FileUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/file/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
