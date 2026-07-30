# Phase 3 — 知识库（RAG）★★★★★ 设计方案

**日期**: 2026-07-29
**来源**: 麻也龙太需求文档§6 + 力齐早早调研 / 龙太×早早需求讨论

---

## 1. 架构总览

当前技术栈：Express + tRPC v11 + Prisma + SQLite（非 Blinko 方案）
RAG 方案需基于现有栈，不引入新数据库。

```
用户搜索 "上周开心的事"
  → 前端语义搜索框
  → 后端生成搜索文本的 embedding 向量
  → SQLite vec 相似度搜索
  → 返回匹配的日记 + 摘要
  → 前端展示搜索结果卡片
```

---

## 2. 核心方案

### 2.1 向量存储方案：`sqlite-vec`

- **sqlite-vec** — 纯 C 扩展，零依赖，SQLite 原生向量搜索
- 直接在现有 SQLite 数据库新增 `diary_embeddings` 表
- 支持余弦相似度、L2 距离等
- 无需单独部署向量数据库

### 2.2 Embedding 方案：复用已配 LLM API

- 目前已配 4 个 LLM 平台都支持 embeddings API（/v1/embeddings）
- 用户无需额外配置，直接用已保存的 API Key
- 新增 `embedding` 配置项（可选），默认与 chat 平台一致

### 2.3 Prisma Schema

```prisma
// 日记 embedding（单独表，不与 diary 耦合太紧）
model DiaryEmbedding {
  id        Int    @id @default(autoincrement())
  diaryId   Int    @unique              // 一对一，每篇日记一个 embedding
  vector    Bytes  @map("vector")       // raw float32 bytes
  model     String                      // 生成此 embedding 的模型名
  updatedAt DateTime @updatedAt
  diary     Diary  @relation(fields: [diaryId], references: [id], onDelete: Cascade)

  @@map("diary_embeddings")
}

// 语义搜索日志
model SearchLog {
  id        Int      @id @default(autoincrement())
  query     String
  embedding Bytes
  results   Int      // 返回条数
  createdAt DateTime @default(now())

  @@map("search_logs")
}

// 知识图谱实体
model GraphEntity {
  id        Int      @id @default(autoincrement())
  type      String   // 'person' | 'event' | 'place' | 'emotion' | 'topic'
  name      String
  diaryIds  String   // JSON array of diary IDs
  createdAt DateTime @default(now())

  @@unique([type, name])
  @@map("graph_entities")
}

// 实体关系
model GraphRelation {
  id          Int      @id @default(autoincrement())
  sourceId    Int
  targetId    Int
  relation    String   // 'mentioned_together' | 'related_to' | 'causes'
  weight      Float    @default(1.0)
  createdAt   DateTime @default(now())
  source      GraphEntity @relation("source_entity", fields: [sourceId], references: [id])
  target      GraphEntity @relation("target_entity", fields: [targetId], references: [id])

  @@map("graph_relations")
}
```

### 2.4 API 路由

| 方法 | 路由 | 说明 |
|:-----|:------|:------|
| mutation | `rag.indexAll` | 批量生成所有日记的 embeddings |
| mutation | `rag.indexDiary` | 单篇日记生成 embedding（创建/编辑时调用） |
| mutation | `rag.reindex` | 重新生成指定日记的 embedding |
| query | `rag.search` | 语义搜索：输入文本 → embedding → 相似度查询 |
| mutation | `rag.extractEntities` | 从日记中提取实体（人物/事件/地点等） |
| query | `rag.graph` | 获取知识图谱数据 |
| query | `rag.entityDetail` | 实体详情（关联的日记列表） |

---

## 3. 任务拆分

### 3.1 后端基础（P0）
**负责人**: Cindy/林正树

1. 安装 `sqlite-vec` 依赖
2. Prisma Schema 新增 3 个表（`diary_embeddings`, `graph_entities`, `graph_relations`）
3. 新增 `rag.indexAll` 路由：遍历所有日记，调 LLM embeddings API 生成向量并存储
4. 新增 `rag.search` 路由：输入文本 → embedding → vec 相似度 TOP 10 返回
5. 日记创建/编辑时自动触发 `rag.indexDiary`

### 3.2 语义搜索 UI（P0）
**负责人**: lamda + miky（设计）

1. 搜索 Tab 增强 — 支持"关键词搜索"和"语义搜索"两种模式
2. 语义搜索输入框 + 结果卡片列表
3. 结果按相似度排序，显示匹配段落高亮
4. 可搜索"上周开心的事"这类自然语言

### 3.3 实体提取（P1）
**负责人**: Cindy/林正树

1. 新增 `rag.extractEntities` 路由：调 LLM 从日记中提取实体
2. 批量处理已有日记
3. 新增日记时自动提取

### 3.4 知识图谱（P1）
**负责人**: lamda + miky（设计）

1. `rag.graph` 路由返回图谱数据（nodes + edges）
2. 前端知识图谱可视化（基于 dagre/D3 或 canvas 手绘）
3. 在 AI 总结 Tab 或独立 Tab 展示
4. 节点可点击跳转到相关日记

### 3.5 开发排期

| 模块 | 负责人 | 预估工时 |
|:-----|:-------|:---------|
| sqlite-vec 集成 + Prisma 表 | Cindy/林正树 | 30min |
| embedding + indexAll 路由 | Cindy/林正树 | 1h |
| 语义搜索路由 | Cindy/林正树 | 30min |
| 语义搜索前端 UI | lamda | 1h |
| 实体提取路由 | Cindy/林正树 | 1h |
| 知识图谱前端 | lamda | 1.5h |
| 联调 + 修复 | 全员 | 1h |
| **总计** | 3 人 | ~5.5h |
