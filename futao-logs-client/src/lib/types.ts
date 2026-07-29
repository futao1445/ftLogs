/* ─── Shared types matching backend API ─── */

export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiaryTag {
  diaryId: number;
  tagId: number;
  tag: Tag;
}

export interface Attachment {
  id: number;
  diaryId: number;
  filepath: string;
  filename: string;
  mimeType: string;
  sortOrder: number;
  createdAt?: string;
}

export interface Diary {
  id: number;
  content: string;
  date: string;
  mood: string | null;
  weather: string | null;
  isTop: boolean;
  isArchived: boolean;
  bookId: number | null;
  createdAt: string;
  updatedAt: string;
  tags: DiaryTag[];
  attachments: Attachment[];
}

export interface DiaryListResult {
  items: Diary[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface TimelineGroup {
  date: string;
  diaries: Diary[];
  count: number;
}

export interface TimelineResult {
  items: TimelineGroup[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  previews: { id: number; preview: string; mood: string | null }[];
}

export interface CalendarResult {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface DiaryUpsertInput {
  content?: string;
  date?: string;
  mood?: string | null;
  weather?: string | null;
  isTop?: boolean | null;
  isArchived?: boolean | null;
  bookId?: number | null;
  tags?: number[];
  id?: number;
}

export interface DiaryListInput {
  page?: number;
  size?: number;
  orderBy?: 'asc' | 'desc';
  searchText?: string;
  tagId?: number | null;
  isArchived?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface FileUploadResult {
  files: { filename: string; filepath: string }[];
}
