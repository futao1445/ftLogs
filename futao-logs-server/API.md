# Futao Logs API 文档 (Phase 1)

## 服务器信息
- 地址: `http://localhost:1111`
- tRPC 端点: `http://localhost:1111/api/trpc`
- 健康检查: `GET /health`

## 技术说明
- 框架: tRPC v11 + Express 4
- 数据库: SQLite (Prisma ORM)
- 启动: `node server/combined.cjs`
- 前端使用 tRPC Client（`@trpc/client`）调用，自动处理 batch/序列化

## 类型定义

```typescript
// —— 日记 ——
interface Diary {
  id: number;
  content: string;       // Markdown 内容
  date: string;          // ISO date
  mood: string | null;   // 心情
  weather: string | null;
  isTop: boolean;        // 置顶
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  bookId: number | null;
  tags: { diaryId: number; tagId: number; tag: Tag }[];
  attachments: Attachment[];
}

// —— 标签 ——
interface Tag {
  id: number;
  name: string;
  color: string;    // hex: #ff6b6b
  icon: string;
  sortOrder: number;
  _count?: { diaries: number };
}

// —— 附件 ——
interface Attachment {
  id: number;
  name: string;
  path: string;      // /uploads/xxx.jpg
  size: number;
  type: string;      // mime type
  diaryId: number | null;
  sortOrder: number;
}
```

## API

### diary.* — 日记 CRUD

#### list — 日记列表
```
QUERY diary.list
Input: {
  page?: number       (default 1)
  size?: number       (default 30)
  orderBy?: 'asc' | 'desc' (default 'desc')
  searchText?: string  (全文搜索)
  tagId?: number | null
  bookId?: number | null
  isArchived?: boolean | null (default false)
  startDate?: string | null  (YYYY-MM-DD)
  endDate?: string | null    (YYYY-MM-DD)
}
Output: { items: Diary[], total: number, page: number, size: number, totalPages: number }
```

#### detail — 单条详情
```
QUERY diary.detail
Input: { id: number }
Output: Diary | null
```

#### upsert — 创建/更新
```
MUTATION diary.upsert
Input: {
  id?: number            // 有=更新，无=创建
  content?: string       (default '')
  date?: string          (ISO date, default now)
  mood?: string | null
  weather?: string | null
  isTop?: boolean | null
  isArchived?: boolean | null
  bookId?: number | null
  tags?: number[]        // tag IDs
}
Output: Diary (含关联)
```

#### delete — 批量删除
```
MUTATION diary.delete
Input: { ids: number[] }
Output: { success: true }
```

#### calendar — 日历视图
```
QUERY diary.calendar
Input: { year: number, month: number }  // month: 1-12
Output: {
  year: number
  month: number
  days: { date: string, count: number, previews: { id: number, preview: string, mood: string|null }[] }[]
}
```

#### timeline — 时间线（按日分组）
```
QUERY diary.timeline
Input: { page?: number (default 1), size?: number (default 10) }
Output: {
  items: { date: string, diaries: Diary[], count: number }[]
  total: number
  page: number
  size: number
  totalPages: number
}
```

### tag.* — 标签

#### list — 标签列表
```
QUERY tag.list
Input: { searchText?: string }
Output: Tag[] (含 _count.diaries)
```

#### upsert — 创建/更新
```
MUTATION tag.upsert
Input: { id?: number, name: string, color?: string, icon?: string }
Output: Tag
```

#### delete — 删除
```
MUTATION tag.delete
Input: { id: number }
Output: { success: true }
```

### config.* — 配置

#### get
```
QUERY config.get
Input: { key: string }
Output: any | null
```

#### getAll
```
QUERY config.getAll
Input: none
Output: Record<string, any>
```

#### set
```
MUTATION config.set
Input: { key: string, value: any }
Output: { success: true }
```

### export.* — 导出

#### markdown
```
MUTATION export.markdown
Input: { ids?: number[], bookId?: number }
Output: { filePath: string, diaryCount: number }
```

#### json
```
MUTATION export.json
Input: { ids?: number[] }
Output: { filePath: string, diaryCount: number }
```

#### history
```
QUERY export.history
Input: none
Output: export[]
```

## 文件上传
```
POST /api/file/upload
Content-Type: multipart/form-data

Response: { files: { filename: string, filepath: string }[] }
```

## 静态文件
- `/uploads/*` — 上传文件
- `/exports/*` — 导出文件
