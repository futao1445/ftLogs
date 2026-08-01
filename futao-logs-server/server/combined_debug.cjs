require('dotenv').config();
const express = require('express');
const { initTRPC } = require('@trpc/server');
const { createExpressMiddleware } = require('@trpc/server/adapters/express');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const busboy = require('busboy');

const prisma = new PrismaClient();
const t = initTRPC.create();

const PORT = parseInt(process.env.PORT || '1111', 10);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
const exportDir = path.resolve(process.cwd(), 'exports');

// 确保上传和导出目录存在
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

// ═══════════════════════════════════════════
// 日记 API
// ═══════════════════════════════════════════

const diaryRouter = t.router({
  // ─── 日记列表 ────────────────────────
  list: t.procedure
    .input(z.object({
      page: z.number().default(1),
      size: z.number().default(30),
      orderBy: z.enum(['asc', 'desc']).default('desc'),
      searchText: z.string().default('').optional(),
      tagId: z.number().nullable().default(null).optional(),
      bookId: z.number().nullable().default(null).optional(),
      isArchived: z.boolean().nullable().default(false).optional(),
      startDate: z.string().nullable().default(null).optional(),
      endDate: z.string().nullable().default(null).optional(),
    }))
    .query(async ({ input }) => {
      const { page, size, orderBy, searchText, tagId, bookId, isArchived, startDate, endDate } = input;
      const where = {};
      if (isArchived !== null) where.isArchived = isArchived;
      if (searchText && searchText.trim()) where.content = { contains: searchText };
      if (tagId) {
        const links = await prisma.diaries_tags.findMany({ where: { tagId } });
        where.id = { in: links.map(l => l.diaryId) };
      }
      if (bookId) where.bookId = bookId;
      if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };

      const items = await prisma.diaries.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { date: orderBy }, { createdAt: orderBy }],
        skip: (page - 1) * size,
        take: size,
        include: {
          tags: { include: { tag: true } },
          attachments: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        },
      });
      const total = await prisma.diaries.count({ where });
      return { items, total, page, size, totalPages: Math.ceil(total / size) };
    }),

  // ─── 单条日记 ────────────────────────
  detail: t.procedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => prisma.diaries.findFirst({
      where: { id: input.id },
      include: { tags: { include: { tag: true } }, attachments: true },
    })),

  // ─── 创建/更新日记 ───────────────────
  upsert: t.procedure
    .input(z.object({
      content: z.string().default(''),
      date: z.string().optional(),
      mood: z.string().nullable().optional(),
      weather: z.string().nullable().optional(),
      isTop: z.boolean().nullable().default(null),
      isArchived: z.boolean().nullable().default(null),
      bookId: z.number().nullable().optional(),
      tags: z.array(z.number()).optional(),
      id: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, content, date, mood, weather, isTop, isArchived, bookId, tags } = input;
      if (id) {
        const updateData = {};
        if (content !== undefined) updateData.content = content;
        if (date !== undefined) {
          const d = new Date(date);
          updateData.date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        }
        if (mood !== undefined) updateData.mood = mood;
        if (weather !== undefined) updateData.weather = weather;
        if (isTop !== null) updateData.isTop = isTop;
        if (isArchived !== null) updateData.isArchived = isArchived;
        if (bookId !== undefined) updateData.bookId = bookId;
        await prisma.diaries.update({ where: { id }, data: updateData });
        if (tags !== undefined) {
          await prisma.diaries_tags.deleteMany({ where: { diaryId: id } });
          if (tags.length) {
            await prisma.diaries_tags.createMany({ data: tags.map(t => ({ diaryId: id, tagId: t })) });
          }
        }
        // 异步更新 embedding
        getEmbedding(content || '').then(vector => {
          return prisma.diary_embeddings.upsert({
            where: { diaryId: id },
            create: { diaryId: id, vector: JSON.stringify(vector), model: 'auto' },
            update: { vector: JSON.stringify(vector), model: 'auto', updatedAt: new Date() },
          });
        }).catch(() => {});
        return prisma.diaries.findFirst({
          where: { id },
          include: { tags: { include: { tag: true } }, attachments: true },
        });
      }
      // 创建新日记
      const diary = await prisma.diaries.create({
        data: {
          content: content || '',
          date: (() => { const d = date ? new Date(date) : new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); })(),
          mood: mood || null,
          weather: weather || null,
          isTop: isTop ?? false,
          isArchived: isArchived ?? false,
          bookId: bookId || null,
        },
      });
      if (tags && tags.length) {
        await prisma.diaries_tags.createMany({
          data: tags.map(t => ({ diaryId: diary.id, tagId: t })),
        });
      }
      const result = await prisma.diaries.findFirst({
        where: { id: diary.id },
        include: { tags: { include: { tag: true } }, attachments: true },
      });
      // 异步生成 embedding（不阻塞返回）
      getEmbedding(result.content).then(vector => {
        return prisma.diary_embeddings.upsert({
          where: { diaryId: diary.id },
          create: { diaryId: diary.id, vector: JSON.stringify(vector), model: 'auto' },
          update: { vector: JSON.stringify(vector), model: 'auto', updatedAt: new Date() },
        });
      }).catch(() => {});
      return result;
    }),

  // ─── 删除日记 ────────────────────────
  delete: t.procedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const result = await prisma.diaries.deleteMany({ where: { id: { in: input.ids } } });
      return { success: true, deleted: result.count };
    }),

  // ─── 日历查询 ────────────────────────
  calendar: t.procedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
      const diaries = await prisma.diaries.findMany({
        where: { isArchived: false, date: { gte: startDate, lte: endDate } },
        select: { id: true, date: true, content: true, mood: true },
        orderBy: { date: 'asc' },
      });
      const dateMap = {};
      for (const d of diaries) {
        const k = d.date.toISOString().split('T')[0];
        if (!dateMap[k]) dateMap[k] = { count: 0, items: [] };
        dateMap[k].count++;
        dateMap[k].items.push({
          id: d.id,
          preview: d.content.replace(/[#*`\[\]]/g, '').substring(0, 60),
          mood: d.mood,
        });
      }
      return {
        year: input.year, month: input.month, days: Object.entries(dateMap).map(([date, data]) => ({
          date,
          count: data.count,
          previews: data.items.slice(0, 3),
        })),
      };
    }),

  // ─── 时间线 ──────────────────────────
  timeline: t.procedure
    .input(z.object({ page: z.number().default(1), size: z.number().default(10), tagId: z.number().nullable().default(null).optional() }))
    .query(async ({ input }) => {
      const { page, size, tagId } = input;
      const where = { isArchived: false };
      if (tagId) {
        const links = await prisma.diaries_tags.findMany({ where: { tagId } });
        where.id = { in: links.map(l => l.diaryId) };
      }
      const diaries = await prisma.diaries.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          tags: { include: { tag: true } },
          attachments: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        },
      });
      const groups = {};
      for (const d of diaries) {
        const k = d.date.toISOString().split('T')[0];
        if (!groups[k]) groups[k] = [];
        groups[k].push(d);
      }
      // 每天内按 createdAt 倒序（最新在前）
      for (const k of Object.keys(groups)) {
        groups[k].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
      const total = sortedDates.length;
      const start = (input.page - 1) * input.size;
      return {
        items: sortedDates.slice(start, start + input.size).map(d => ({
          date: d,
          diaries: groups[d],
          count: groups[d].length,
        })),
        total,
        page: input.page,
        size: input.size,
        totalPages: Math.ceil(total / input.size),
      };
    }),

  // ─── 历史上的今天 ─────────────────────
  onThisDay: t.procedure
    .input(z.object({ month: z.number(), day: z.number() }))
    .query(async ({ input }) => {
      const diaries = await prisma.diaries.findMany({
        where: { isArchived: false },
        orderBy: { date: 'desc' },
        select: { id: true, date: true, content: true },
      });
      const now = new Date();
      const matches = [];
      for (const d of diaries) {
        const dDate = new Date(d.date);
        if (dDate.getUTCMonth() + 1 === input.month && dDate.getUTCDate() === input.day) {
          const year = dDate.getUTCFullYear();
          if (year !== now.getFullYear()) {
            matches.push({
              id: d.id,
              year,
              preview: d.content.replace(/[#*`\[\]]/g, '').substring(0, 60),
            });
          }
        }
      }
      return matches.length > 0 ? matches[0] : null;
    }),
});

// ═══════════════════════════════════════════
// 标签 API
// ═══════════════════════════════════════════

const tagRouter = t.router({
  list: t.procedure
    .input(z.object({ searchText: z.string().default('').optional() }))
    .query(async ({ input }) => prisma.tags.findMany({
      where: input.searchText ? { name: { contains: input.searchText } } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { diaries: true } } },
    })),
  upsert: t.procedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      color: z.string().default(''),
      icon: z.string().default(''),
    }))
    .mutation(async ({ input }) => {
      const { id, name, color, icon } = input;
      if (id) return prisma.tags.update({ where: { id }, data: { name, color, icon } });
      return prisma.tags.create({ data: { name, color, icon } });
    }),
  delete: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const exists = await prisma.tags.findUnique({ where: { id: input.id } });
      if (!exists) return { success: false, error: '标签不存在' };
      const usage = await prisma.diaries_tags.count({ where: { tagId: input.id } });
      await prisma.tags.delete({ where: { id: input.id } });
      return { success: true, removedFromDiaries: usage };
    }),
});

// ═══════════════════════════════════════════
// 配置 API
// ═══════════════════════════════════════════

const configRouter = t.router({
  get: t.procedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const c = await prisma.config.findUnique({ where: { key: input.key } });
      if (!c) return null;
      try { return JSON.parse(c.value); } catch { return c.value; }
    }),
  getAll: t.procedure.query(async () => {
    const configs = await prisma.config.findMany();
    const r = {};
    for (const c of configs) {
      try { r[c.key] = JSON.parse(c.value); } catch { r[c.key] = c.value; }
    }
    return r;
  }),
  set: t.procedure
    .input(z.object({ key: z.string(), value: z.any() }))
    .mutation(async ({ input }) => {
      const v = typeof input.value === 'string' ? input.value : JSON.stringify(input.value);
      await prisma.config.upsert({
        where: { key: input.key },
        update: { value: v },
        create: { key: input.key, value: v },
      });
      return { success: true };
    }),
});

// ═══════════════════════════════════════════
// 导出 API
// ═══════════════════════════════════════════

const exportRouter = t.router({
  markdown: t.procedure
    .input(z.object({ ids: z.array(z.number()).optional(), bookId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const where = { isArchived: false };
      if (input.ids?.length) where.id = { in: input.ids };
      if (input.bookId) where.bookId = input.bookId;
      const diaries = await prisma.diaries.findMany({
        where, orderBy: { date: 'desc' },
        include: { tags: { include: { tag: true } }, attachments: true },
      });
      let md = `# Futao Logs 导出\n\n导出时间：${new Date().toLocaleString()}\n日记数量：${diaries.length}\n\n---\n\n`;
      for (const d of diaries) {
        const ds = d.date.toISOString().split('T')[0];
        const ts = d.tags.map(t => t.tag.name).join(', ');
        md += `## ${ds}\n\n`;
        if (ts) md += `标签：${ts}\n\n`;
        if (d.mood) md += `心情：${d.mood}\n\n`;
        md += `${d.content}\n\n---\n\n`;
      }
      const fn = `futao-logs-${Date.now()}.md`;
      fs.writeFileSync(path.join(exportDir, fn), md, 'utf-8');
      await prisma.exports.create({
        data: { format: 'markdown', status: 'done', filePath: `/exports/${fn}`, diaryCount: diaries.length },
      });
      return { filePath: `/exports/${fn}`, diaryCount: diaries.length };
    }),

  json: t.procedure
    .input(z.object({ ids: z.array(z.number()).optional() }))
    .mutation(async ({ input }) => {
      const where = {};
      if (input.ids?.length) where.id = { in: input.ids };
      const diaries = await prisma.diaries.findMany({
        where, orderBy: { date: 'desc' },
        include: { tags: { include: { tag: true } }, attachments: true },
      });
      const fn = `futao-logs-${Date.now()}.json`;
      fs.writeFileSync(path.join(exportDir, fn), JSON.stringify(diaries, null, 2), 'utf-8');
      await prisma.exports.create({
        data: { format: 'json', status: 'done', filePath: `/exports/${fn}`, diaryCount: diaries.length },
      });
      return { filePath: `/exports/${fn}`, diaryCount: diaries.length };
    }),

  history: t.procedure.query(async () =>
    prisma.exports.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ),
});

// ═══════════════════════════════════════════
// AI 总结 API（分层：日→周→月→年）
// ═══════════════════════════════════════════

const summaryRouter = t.router({
  list: t.procedure
    .input(z.object({ types: z.array(z.enum(['day','week','month','year'])).optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const where = input.types?.length ? { type: { in: input.types } } : {};
      return prisma.summaries.findMany({ where, orderBy: { createdAt: 'desc' }, take: input.limit });
    }),
  get: t.procedure
    .input(z.object({ type: z.string(), periodKey: z.string() }))
    .query(async ({ input }) => prisma.summaries.findUnique({ where: { type_periodKey: { type: input.type, periodKey: input.periodKey } } })),
  generate: t.procedure
    .input(z.object({ type: z.enum(['day','week','month','year']), date: z.string().optional(), feedback: z.string().optional() }))
    .mutation(async ({ input }) => {
      const readCfg = (key) => prisma.config.findUnique({ where: { key } }).then(c => { if (!c) return null; try { return JSON.parse(c.value); } catch { return c.value; } }).catch(() => null);
      const activeProvider = await readCfg('llm_provider_active') || 'custom';
      const KNOWN_URLS = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
      const [apiUrl, apiKey, model] = await Promise.all([
        KNOWN_URLS[activeProvider] ? Promise.resolve(KNOWN_URLS[activeProvider]) : readCfg(`llm_${activeProvider}_api_url`).then(v => v || 'https://api.openai.com/v1'),
        readCfg(`llm_${activeProvider}_api_key`),
        readCfg(`llm_${activeProvider}_model`).then(v => v || 'gpt-4o-mini'),
      ]);
      if (!apiKey) return { success: false, error: 'LLM 未配置，请先在设置中保存 API Key' };
      const now = new Date();
      const baseDate = input.date ? new Date(input.date) : now;
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth() + 1;
      const d = baseDate.getDate();
      const dayStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const monthStr = `${y}-${String(m).padStart(2,'0')}`;
      const getWeekKey = (dt) => { const t = new Date(dt); const dn = t.getDay()||7; t.setDate(t.getDate()-dn+1); const y2=t.getFullYear(),m2=t.getMonth()+1,d2=t.getDate(); return `${y2}-W${String(Math.ceil(d2/7)).padStart(2,'0')}`; };
      let periodKey, sourceData;
      if (input.type === 'day') {
        periodKey = dayStr;
        const diaries = await prisma.diaries.findMany({ where: { isArchived: false, date: { gte: new Date(dayStr+'T00:00:00.000Z'), lte: new Date(dayStr+'T23:59:59.999Z') } }, orderBy: { createdAt: 'asc' }, select: { content: true, mood: true, createdAt: true } });
        if (diaries.length===0) return { success: false, error: `${dayStr} 没有日记` };
        sourceData = diaries.map((di,i) => {
          const localTime = new Date(di.createdAt.getTime() + 8 * 60 * 60 * 1000);
          return `[日记 ${i+1}] 时间: ${localTime.toISOString().slice(11,16)} 心情: ${di.mood||'无'}\n内容: ${di.content}`;
        }).join('\n\n');
      } else if (input.type === 'week') {
        periodKey = getWeekKey(baseDate);
        const weekStart = new Date(baseDate); weekStart.setDate(weekStart.getDate()-weekStart.getDay()+1);
        const days = []; for (let i=0;i<7;i++) { const dt=new Date(weekStart); dt.setDate(dt.getDate()+i); days.push(dt.toISOString().split('T')[0]); }
        const existing = await prisma.summaries.findMany({ where: { type: 'day', periodKey: { in: days } }, orderBy: { periodKey: 'asc' }, select: { periodKey: true, content: true, analysis: true, advice: true } });
        if (existing.length===0) {
          const weekStartD = new Date(days[0]+'T00:00:00.000Z'), weekEndD = new Date(days[days.length-1]+'T23:59:59.999Z');
          const di = await prisma.diaries.findMany({ where: { isArchived: false, date: { gte: weekStartD, lte: weekEndD } }, orderBy: [{date:'asc'},{createdAt:'asc'}], select: { date: true, content: true, mood: true } });
          if (di.length===0) return { success: false, error: '本周没有日记' };
          sourceData = di.map((d_,i) => `[日记 ${i+1}] 日期: ${d_.date.toISOString().split('T')[0]} 心情: ${d_.mood||'无'}\n内容: ${d_.content}`).join('\n\n');
        } else { sourceData = existing.map(e => `[${e.periodKey} 每日总结]\n${e.content||e.analysis||'无'}\n建议: ${e.advice||'无'}`).join('\n\n'); }
      } else if (input.type === 'month') {
        periodKey = monthStr;
        const existing = await prisma.summaries.findMany({ where: { type: 'week', periodKey: { startsWith: `${y}-W` } }, orderBy: { periodKey: 'asc' }, select: { periodKey: true, content: true, analysis: true, advice: true } });
        const monthWeeks = existing.filter(e => { const wn = parseInt(e.periodKey.split('-W')[1]); const fd = new Date(y,0,1+(wn-1)*7); return fd.getMonth()+1 === m; });
        if (monthWeeks.length===0) {
          const di = await prisma.diaries.findMany({ where: { isArchived: false, date: { gte: new Date(monthStr+'-01T00:00:00.000Z'), lte: new Date(y,m,0,23,59,59) } }, orderBy: [{date:'asc'},{createdAt:'asc'}], select: { date: true, content: true, mood: true } });
          if (di.length===0) return { success: false, error: '本月没有日记' };
          sourceData = di.map((d_,i) => `[日记 ${i+1}] 日期: ${d_.date.toISOString().split('T')[0]} 心情: ${d_.mood||'无'}\n内容: ${d_.content}`).join('\n\n');
        } else { sourceData = monthWeeks.map(e => `[${e.periodKey} 周总结]\n${e.content||e.analysis||'无'}\n建议: ${e.advice||'无'}`).join('\n\n'); }
      } else if (input.type === 'year') {
        periodKey = `${y}`;
        const existing = await prisma.summaries.findMany({ where: { type: 'month', periodKey: { startsWith: `${y}-` } }, orderBy: { periodKey: 'asc' }, select: { periodKey: true, content: true, analysis: true, advice: true } });
        if (existing.length===0) {
          const di = await prisma.diaries.findMany({ where: { isArchived: false, date: { gte: new Date(y+'-01-01T00:00:00.000Z'), lte: new Date(y+'-12-31T23:59:59.999Z') } }, orderBy: [{date:'asc'},{createdAt:'asc'}], select: { date: true, content: true, mood: true } });
          if (di.length===0) return { success: false, error: '今年没有日记' };
          sourceData = di.map((d_,i) => `[日记 ${i+1}] 日期: ${d_.date.toISOString().split('T')[0]} 心情: ${d_.mood||'无'}\n内容: ${d_.content}`).join('\n\n');
        } else { sourceData = existing.map(e => `[${e.periodKey} 月度总结]\n${e.content||e.analysis||'无'}\n建议: ${e.advice||'无'}`).join('\n\n'); }
      }
      const feedbackNote = input.feedback ? `\n用户反馈（需根据此意见调整）：${input.feedback}` : '';
      const typeLabel = { day: '每日', week: '每周', month: '每月', year: '每年' }[input.type];
      const systemPrompt = `你是一个专业的日记分析助手。请对以下${typeLabel}日记内容进行全面分析，以 JSON 格式回复。

分析维度：
1. 身体状态 (body) — 睡眠、运动、健康（结合记录时间分析作息是否规律）
2. 精神状态 (mind) — 情绪波动、专注力
3. 心理状态 (psychology) — 压力、焦虑、社交
4. 个人成长 (growth) — 进步、习惯养成

规则：
- 数据中的"时间"是北京时间（UTC+8），基于实际时间分析作息状态（凌晨/上午/下午/晚上）
- 结合日记数量（共N篇）调整分析粒度：篇数少时聚焦关键信息，篇数多时提炼共性趋势
- 建议（advice）格式约束：具体行动 + 预期收益，如"建议今晚11点前关掉电子设备，持续3天可改善精神状态"
- 关键词（keywords）应为有区分度的复合标签（如"工作压力""阅读收获"），避免单个名词，最多5个
- 异常判定标准（满足任一条则在 analysis 中标记）：a) 凌晨00:00~06:00写日记；b) 连续3天同一低情绪（焦虑/悲伤）；c) 突发超长情绪宣泄；d) 连续3天以上中断后突然恢复
- 如果存在多篇日记，分析前后的状态变化趋势（如"相比昨日（平静），今日转为（焦虑）"）
${feedbackNote}
JSON 格式：{"summary":"总体总结","analysis":{"body":"...","mind":"...","psychology":"...","growth":"..."},"advice":"建议","keywords":["k1","k2"]}`;
      try {
        const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `${typeLabel}数据：\n\n${sourceData}` }], max_tokens: 2048 }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) { const bd = await res.text().catch(() => ''); return { success: false, error: `HTTP ${res.status}: ${bd.slice(0,200)}` }; }
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content || '';
        let parsed;
        try { parsed = JSON.parse(text.replace(/```json\n?/g,'').replace(/```/g,'')); } catch { parsed = { summary: text.slice(0,200), analysis: {}, advice: '', keywords: [] }; }
        const existingRecord = await prisma.summaries.findUnique({ where: { type_periodKey: { type: input.type, periodKey } } });
        const upsertData = { content: parsed.summary||'', analysis: JSON.stringify(parsed.analysis||{}), advice: parsed.advice||'', keywords: JSON.stringify(parsed.keywords||[]), sourceIds: '', version: existingRecord ? existingRecord.version+1 : 1, feedback: input.feedback||'' };
        await prisma.summaries.upsert({ where: { type_periodKey: { type: input.type, periodKey } }, create: { type: input.type, periodKey, ...upsertData }, update: { ...upsertData, updatedAt: new Date() } });
        return { success: true, summary: parsed.summary||'', analysis: parsed.analysis||{}, advice: parsed.advice||'', keywords: parsed.keywords||[], version: upsertData.version, periodKey };
      } catch (e) { return { success: false, error: e.message||'AI 请求失败' }; }
    }),
  update: t.procedure
    .input(z.object({ type: z.string(), periodKey: z.string(), content: z.string().optional(), analysis: z.string().optional(), advice: z.string().optional(), keywords: z.string().optional() }))
    .mutation(async ({ input }) => {
      const record = await prisma.summaries.findUnique({ where: { type_periodKey: { type: input.type, periodKey: input.periodKey } } });
      if (!record) return { success: false, error: '总结不存在' };
      const updateData = {};
      if (input.content !== undefined) updateData.content = input.content;
      if (input.analysis !== undefined) updateData.analysis = input.analysis;
      if (input.advice !== undefined) updateData.advice = input.advice;
      if (input.keywords !== undefined) updateData.keywords = input.keywords;
      updateData.version = record.version + 1;
      await prisma.summaries.update({ where: { type_periodKey: { type: input.type, periodKey: input.periodKey } }, data: { ...updateData, updatedAt: new Date() } });
      return { success: true };
    }),
  delete: t.procedure
    .input(z.object({ type: z.string(), periodKey: z.string() }))
    .mutation(async ({ input }) => { await prisma.summaries.deleteMany({ where: { type: input.type, periodKey: input.periodKey } }); return { success: true }; }),
});

// ═══════════════════════════════════════════
// RAG 知识库 API（语义搜索 + 实体提取 + 知识图谱）
// ═══════════════════════════════════════════

// 辅助：读取 LLM 配置
async function readLLMConfig() {
  const readCfg = (key) => prisma.config.findUnique({ where: { key } }).then(c => {
    if (!c) return null;
    try { return JSON.parse(c.value); } catch { return c.value; }
  }).catch(() => null);
  const activeProvider = await readCfg('llm_provider_active') || 'custom';
  const KNOWN_URLS = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
  const [apiUrl, apiKey, model] = await Promise.all([
    KNOWN_URLS[activeProvider] ? Promise.resolve(KNOWN_URLS[activeProvider]) : readCfg(`llm_${activeProvider}_api_url`).then(v => v || 'https://api.openai.com/v1'),
    readCfg(`llm_${activeProvider}_api_key`),
    readCfg(`llm_${activeProvider}_model`).then(v => v || 'text-embedding-3-small'),
  ]);
  return { apiUrl, apiKey, model, activeProvider };
}

// 辅助：调用 LLM embeddings API
async function getEmbedding(text) {
  const readCfg = (key) => prisma.config.findUnique({ where: { key } }).then(c => {
    if (!c) return null; try { return JSON.parse(c.value); } catch { return c.value; }
  }).catch(() => null);
  // 优先使用独立 embedding 配置，无则用 chat 配置
  let apiUrl = await readCfg('embedding_api_url');
  let apiKey = await readCfg('embedding_api_key');
  let model = await readCfg('embedding_model');
  const embedProvider = await readCfg('embedding_provider');
  if (!apiKey) {
    // 回退到 chat 配置
    const chatCfg = await readLLMConfig();
    apiUrl = chatCfg.apiUrl;
    apiKey = chatCfg.apiKey;
    model = model || chatCfg.model;
  } else {
    const KNOWN_URLS = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
    if (!apiUrl && embedProvider) apiUrl = KNOWN_URLS[embedProvider] || 'https://api.openai.com/v1';
  }
  if (!apiKey) throw new Error('EMBEDDING_NOT_CONFIGURED');
  // 尝试不同的 embedding 模型名
  const embedModels = [model, 'deepseek-embedding', 'text-embedding-3-small', 'text-embedding-ada-002', 'embed-v2', 'embedding-v1'];
  const embedUrls = ['/v1/embeddings', '/embeddings', '/beta/embeddings'];
  for (const em of embedModels) {
    for (const ep of embedUrls) {
      try {
        const res = await fetch(`${apiUrl.replace(/\/+$/, '')}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: em, input: text }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.[0]?.embedding) return json.data[0].embedding;
      }
    } catch {}
    }
  }
  // 如果都不支持 embeddings API
  throw new Error('当前 LLM 平台不支持 embeddings API。请到设置中切换到 OpenAI / 阿里云 / Kimi 等支持 embeddings 的模型');
}

// 余弦相似度
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// 辅助：调用 LLM chat API
async function llmChat(systemPrompt, userMessage) {
  const readCfg = (key) => prisma.config.findUnique({ where: { key } }).then(c => {
    if (!c) return null; try { return JSON.parse(c.value); } catch { return c.value; }
  }).catch(() => null);
  const activeProvider = await readCfg('llm_provider_active') || 'custom';
  const KNOWN_URLS = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
  const [apiUrl, apiKey, model] = await Promise.all([
    KNOWN_URLS[activeProvider] ? Promise.resolve(KNOWN_URLS[activeProvider]) : readCfg(`llm_${activeProvider}_api_url`).then(v => v || 'https://api.openai.com/v1'),
    readCfg(`llm_${activeProvider}_api_key`),
    readCfg(`llm_${activeProvider}_model`).then(v => v || 'gpt-4o-mini'),
  ]);
  if (!apiKey) throw new Error('LLM 未配置');
  const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], max_tokens: 4096 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) { const bd = await res.text().catch(() => ''); throw new Error(`LLM HTTP ${res.status}: ${bd.slice(0,200)}`); }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

const ragRouter = t.router({
  // ─── 生成单篇日记的 embedding ─────────
  indexDiary: t.procedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ input }) => {
      const diary = await prisma.diaries.findUnique({ where: { id: input.diaryId } });
      if (!diary) return { success: false, error: '日记不存在' };
      try {
        const vector = await getEmbedding(diary.content);
        const vectorStr = JSON.stringify(vector);
        const { apiUrl, model } = await readLLMConfig();
        await prisma.diary_embeddings.upsert({
          where: { diaryId: input.diaryId },
          create: { diaryId: input.diaryId, vector: vectorStr, model },
          update: { vector: vectorStr, model, updatedAt: new Date() },
        });
        return { success: true, dimensions: vector.length };
      } catch (e) {
        return { success: false, error: e.message || 'embedding 生成失败' };
      }
    }),

  // ─── 批量索引所有日记 ─────────────────
  indexAll: t.procedure
    .input(z.object({ force: z.boolean().default(false) }))
    .mutation(async ({ input }) => {
      const existingIds = new Set(
        (await prisma.diary_embeddings.findMany({ select: { diaryId: true } })).map(e => e.diaryId)
      );
      const diaries = await prisma.diaries.findMany({
        where: input.force ? {} : { id: { notIn: [...existingIds] } },
        orderBy: { createdAt: 'asc' },
      });
      if (diaries.length === 0) return { success: true, total: 0, message: '所有日记已索引' };
      let indexed = 0, errors = 0;
      for (const diary of diaries) {
        try {
          const vector = await getEmbedding(diary.content);
          const { model } = await readLLMConfig();
          await prisma.diary_embeddings.upsert({
            where: { diaryId: diary.id },
            create: { diaryId: diary.id, vector: JSON.stringify(vector), model },
            update: { vector: JSON.stringify(vector), model, updatedAt: new Date() },
          });
          indexed++;
        } catch { errors++; }
      }
      return { success: true, total: diaries.length, indexed, errors };
    }),

  // ─── 语义搜索（含关键词回退） ─────
  search: t.procedure
    .input(z.object({ query: z.string(), limit: z.number().default(10), minScore: z.number().default(0.5) }))
    .query(async ({ input }) => {
      if (!input.query.trim()) return { items: [], query: input.query };
      try {
        const queryVector = await getEmbedding(input.query);
        const allEmbeddings = await prisma.diary_embeddings.findMany({ select: { diaryId: true, vector: true } });
        if (allEmbeddings.length > 0) {
          const scored = [];
          for (const emb of allEmbeddings) {
            try { const vec = JSON.parse(emb.vector); const s = cosineSimilarity(queryVector, vec); if (s >= input.minScore) scored.push({ diaryId: emb.diaryId, score: s }); } catch {}
          }
          scored.sort((a,b)=>b.score-a.score);
          const top = scored.slice(0, input.limit);
          const diaryIds = top.map(s=>s.diaryId);
          const diaries = diaryIds.length ? await prisma.diaries.findMany({ where:{id:{in:diaryIds}}, include:{tags:{include:{tag:true}}} }) : [];
          const dm = {}; diaries.forEach(d=>dm[d.id]=d);
          await prisma.search_logs.create({ data:{query:input.query, results:top.length} });
          return { items: top.map(s=>({diary:dm[s.diaryId]||null, score:Math.round(s.score*10000)/10000})).filter(i=>i.diary), query:input.query, mode:"semantic" };
        }
      } catch {}
      const diaries = await prisma.diaries.findMany({ where:{isArchived:false, content:{contains:input.query}}, orderBy:[{date:"desc"},{createdAt:"desc"}], take:input.limit, include:{tags:{include:{tag:true}}} });
      await prisma.search_logs.create({ data:{query:input.query, results:diaries.length} });
      return { items: diaries.map(d=>({diary:d, score:1})), query:input.query, mode:"keyword", note:"语义搜索需额外配置 embedding 服务（设置 > embedding 配置），当前已自动降级为关键词搜索" };
    }),

// ─── 实体提取 ──────────────────────
  extractEntities: t.procedure
    .input(z.object({ diaryId: z.number().optional(), diaryIds: z.array(z.number()).optional() }))
    .mutation(async ({ input }) => {
      const ids = input.diaryIds || (input.diaryId ? [input.diaryId] : []);
      if (!ids.length) {
        // 批量提取所有未提取过实体的日记
        const existing = await prisma.graph_entities.findMany({ select: { diaryIds: true } });
        const allIds = new Set();
        for (const e of existing) { try { JSON.parse(e.diaryIds).forEach(id => allIds.add(id)); } catch {} }
        const diaries = await prisma.diaries.findMany({
          where: { id: { notIn: [...allIds] } },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: { id: true, content: true },
        });
        if (!diaries.length) return { success: true, total: 0, message: '没有未处理的日记' };
        let extracted = 0, errors = 0;
        for (const diary of diaries) {
          try {
            const result = await llmChat(
              '你是一个实体提取助手。从日记中提取人物(person)、地点(place)、事件(event)、情绪(emotion)、话题(topic)实体。' +
              '只回复 JSON 数组：{"entities":[{"type":"person","name":"张三"}]}。如果不确定，返回空数组。',
              diary.content
            );
            let entities;
            try {
              const clean = result.replace(/```json\n?/g,'').replace(/```/g,'').trim();
              entities = JSON.parse(clean).entities || [];
            } catch { entities = []; }
            for (const ent of entities) {
              const existing = await prisma.graph_entities.findUnique({
                where: { type_name: { type: ent.type, name: ent.name } },
              });
              if (existing) {
                const ids_ = new Set(JSON.parse(existing.diaryIds));
                ids_.add(diary.id);
                await prisma.graph_entities.update({
                  where: { id: existing.id },
                  data: { diaryIds: JSON.stringify([...ids_]) },
                });
              } else {
                await prisma.graph_entities.create({
                  data: { type: ent.type, name: ent.name, diaryIds: JSON.stringify([diary.id]) },
                });
              }
            }
            extracted++;
          } catch { errors++; }
        }
        return { success: true, total: diaries.length, extracted, errors };
      }
      // 提取指定日记
      const diaries = await prisma.diaries.findMany({ where: { id: { in: ids } } });
      if (!diaries.length) return { success: false, error: '日记不存在' };
      let extracted = 0, errors = 0;
      for (const diary of diaries) {
        try {
          const result = await llmChat(
            '你是一个实体提取助手。从日记中提取人物、地点、事件、情绪、话题实体。' +
            '只回复 JSON：{"entities":[{"type":"person","name":"张三"}]}。',
            diary.content
          );
          let entities;
          try {
            const clean = result.replace(/```json\n?/g,'').replace(/```/g,'').trim();
            entities = JSON.parse(clean).entities || [];
          } catch { entities = []; }
          for (const ent of entities) {
            const existing = await prisma.graph_entities.findUnique({
              where: { type_name: { type: ent.type, name: ent.name } },
            });
            if (existing) {
              const ids_ = new Set(JSON.parse(existing.diaryIds));
              ids_.add(diary.id);
              await prisma.graph_entities.update({
                where: { id: existing.id },
                data: { diaryIds: JSON.stringify([...ids_]) },
              });
            } else {
              await prisma.graph_entities.create({
                data: { type: ent.type, name: ent.name, diaryIds: JSON.stringify([diary.id]) },
              });
            }
          }
          extracted++;
        } catch { errors++; }
      }
      return { success: true, total: diaries.length, extracted, errors };
    }),

  // ─── 获取知识图谱数据 ─────────────────
  graph: t.procedure
    .input(z.object({ type: z.string().optional() }))
    .query(async ({ input }) => {
      const where = input.type ? { type: input.type } : {};
      const entities = await prisma.graph_entities.findMany({ where, orderBy: { createdAt: 'desc' } });
      const edges = [];
      for (const e of entities) {
        const targetIds = JSON.parse(e.diaryIds);
        for (const e2 of entities) {
          if (e.id >= e2.id) continue;
          const tIds = JSON.parse(e2.diaryIds);
          const shared = targetIds.filter(id => tIds.includes(id));
          if (shared.length > 0) {
            // 已有关系记录？有则更新权重
            const existing = await prisma.graph_relations.findFirst({
              where: {
                OR: [
                  { sourceId: e.id, targetId: e2.id },
                  { sourceId: e2.id, targetId: e.id },
                ],
              },
            });
            if (existing) {
              await prisma.graph_relations.update({
                where: { id: existing.id },
                data: { weight: existing.weight + 1 },
              });
            } else {
              await prisma.graph_relations.create({
                data: { sourceId: e.id, targetId: e2.id, relation: 'mentioned_together', weight: shared.length },
              });
            }
            edges.push({ source: e.id, target: e2.id, weight: shared.length, relation: 'mentioned_together' });
          }
        }
      }
      const nodes = entities.map(e => ({
        id: e.id, type: e.type, name: e.name,
        diaryCount: JSON.parse(e.diaryIds).length,
      }));
      return { nodes, edges };
    }),

  // ─── 实体详情 ──────────────────────
  entityDetail: t.procedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const entity = await prisma.graph_entities.findUnique({ where: { id: input.id } });
      if (!entity) return null;
      const diaryIds = JSON.parse(entity.diaryIds);
      const diaries = await prisma.diaries.findMany({
        where: { id: { in: diaryIds } },
        orderBy: { date: 'desc' },
        include: { tags: { include: { tag: true } } },
      });
      // 关联实体
      const relations = await prisma.graph_relations.findMany({
        where: { OR: [{ sourceId: input.id }, { targetId: input.id }] },
      });
      const relatedIds = new Set();
      for (const r of relations) {
        relatedIds.add(r.sourceId === input.id ? r.targetId : r.sourceId);
      }
      const relatedEntities = relatedIds.size ? await prisma.graph_entities.findMany({
        where: { id: { in: [...relatedIds] } },
      }) : [];
      return {
        entity,
        diaries,
        relatedEntities,
        relations: relations.map(r => ({
          id: r.id, relation: r.relation, weight: r.weight,
          sourceId: r.sourceId, targetId: r.targetId,
        })),
      };
    }),
});

// ═══════════════════════════════════════════
// 汇总路由
// ═══════════════════════════════════════════

const treeholeRouter = t.router({
  // --- 历史对话列表 -----------------
  sessions: t.procedure.query(async () => {
    const rows = await prisma.$queryRawUnsafe('SELECT id, title, updatedAt FROM treehole_sessions ORDER BY updatedAt DESC LIMIT 50');
    return rows;
  }),

  // --- 获取对话消息 -----------------
  messages: t.procedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const rows = await prisma.$queryRawUnsafe('SELECT id, title, messages, createdAt FROM treehole_sessions WHERE id = ?', input.sessionId);
      if (!rows.length) return { error: '对话不存在' };
      const r = rows[0];
      let msgs;
      try { msgs = JSON.parse(r.messages); } catch { msgs = []; }
      return { id: r.id, title: r.title, messages: msgs };
    }),

  // --- 发送消息 ---------------------
  ask: t.procedure
    .input(z.object({ sessionId: z.number(), content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const rows = await prisma.$queryRawUnsafe('SELECT id, title, messages FROM treehole_sessions WHERE id = ?', input.sessionId);
      if (!rows.length) return { success: false, error: '对话不存在' };
      const session = rows[0];
      let msgs;
      try { msgs = JSON.parse(session.messages); } catch { msgs = []; }

      msgs.push({ role: 'user', content: input.content, createdAt: new Date().toISOString() });

const appRouter = t.router({
  diary: diaryRouter,
  tag: tagRouter,
  config: configRouter,
  export: exportRouter,
  summary: summaryRouter,
  treehole: treeholeRouter,
  rag: ragRouter,
  llm: t.router({
    // 获取模型列表（从 API 动态获取）
    models: t.procedure
      .input(z.object({
        provider: z.string().optional(),
        apiKey: z.string().optional(),
        apiUrl: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const readCfg = (key) => prisma.config.findUnique({ where: { key } }).then(c => {
          if (!c) return null;
          try { return JSON.parse(c.value); } catch { return c.value; }
        }).catch(() => null);
        const activeProvider = input.provider || await readCfg('llm_provider_active') || 'custom';
        const KNOWN_URLS = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
        const [apiUrl, apiKey] = await Promise.all([
          input.apiUrl || KNOWN_URLS[activeProvider] || readCfg(`llm_${activeProvider}_api_url`).then(v => v || ''),
          input.apiKey || readCfg(`llm_${activeProvider}_api_key`),
        ]);
        if (!apiUrl || !apiKey) return { models: [], error: '请先配置 LLM' };
        try {
          const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/v1/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) return { models: [], error: `HTTP ${res.status}` };
          const json = await res.json();
          const models = (json.data || []).filter(m => !m.id.startsWith('ft:')).map(m => ({ id: m.id, ownedBy: m.owned_by || '' }));
          return { models };
        } catch (e) { return { models: [], error: e.message || '请求失败' }; }
      }),
    test: t.procedure
      .input(z.object({
        apiUrl: z.string(),
        apiKey: z.string(),
        model: z.string(),
      }))
      .mutation(async ({ input }) => {
        const start = Date.now();
        try {
          const res = await fetch(`${input.apiUrl.replace(/\/+$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${input.apiKey}`,
            },
            body: JSON.stringify({
              model: input.model,
              messages: [{ role: 'user', content: 'Reply with just "ok".' }],
              max_tokens: 10,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}`, latency: Date.now() - start };
          }
          return { success: true, model: input.model, latency: Date.now() - start };
        } catch (e) {
          return { success: false, error: e.message || 'Connection failed', latency: Date.now() - start };
        }
      }),
    chat: t.procedure
      .input(z.object({
        messages: z.array(z.object({ role: z.string(), content: z.string() })),
        provider: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 确定使用的 provider
        const readCfg = (key) => prisma.config.findUnique({ where: { key } }).then(c => {
          if (!c) return null;
          try { return JSON.parse(c.value); } catch { return c.value; }
        }).catch(() => null);
        const activeProvider = input.provider || await readCfg('llm_provider_active') || 'custom';
        // 根据 provider 读取对应配置
        const KNOWN_URLS = {
          deepseek: 'https://api.deepseek.com',
          kimi: 'https://api.moonshot.cn/v1',
          aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        };
        const [apiUrl, apiKey, model] = await Promise.all([
          KNOWN_URLS[activeProvider]
            ? Promise.resolve(KNOWN_URLS[activeProvider])
            : readCfg(`llm_${activeProvider}_api_url`).then(v => v || 'https://api.openai.com/v1'),
          readCfg(`llm_${activeProvider}_api_key`),
          readCfg(`llm_${activeProvider}_model`).then(v => v || 'gpt-4o-mini'),
        ]);
        if (!apiKey) return { success: false, error: 'LLM 未配置，请先在设置中选择平台并保存 API Key' };
        try {
          const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model, messages: input.messages, max_tokens: 2048 }),
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
          }
          const json = await res.json();
          return { success: true, content: json.choices?.[0]?.message?.content || '' };
        } catch (e) {
          return { success: false, error: e.message || 'LLM 请求失败' };
        }
      }),
  }),
});

// ═══════════════════════════════════════════
// Express 服务器
// ═══════════════════════════════════════════

console.log('BEFORE_APP'); try { const app = express(); console.log('AFTER_APP'); } catch(e) { console.log('APP_ERROR:', e.message); }
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext: () => ({}) }));

// 文件上传
app.post('/api/file/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });
  const files = [];
  bb.on('file', (fieldname, file, info) => {
    const ext = path.extname(info.filename) || '.bin';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const savePath = path.join(uploadDir, uniqueName);
    file.pipe(fs.createWriteStream(savePath));
    files.push({ filename: info.filename, filepath: `/uploads/${uniqueName}` });
  });
  bb.on('close', () => res.json({ files }));
  req.pipe(bb);
});

// 静态文件
app.use('/uploads', express.static(uploadDir));
app.use('/exports', express.static(exportDir));
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'futao-logs' }));

// SPA fallback — 所有非 API 请求返回 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads') || req.path.startsWith('/exports')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动
// ═══════════════════════════════════════════
// AI 树洞 API（聊天式 AI 助手）
// ═══════════════════════════════════════════



      const recentDiaries = await prisma.$queryRawUnsafe('SELECT content, date FROM diaries WHERE isArchived = 0 ORDER BY date DESC LIMIT 5');
      const diarySummary = recentDiaries.map(function(d) {
        return '[' + d.date.toISOString().slice(0,10) + '] ' + d.content.slice(0,100);
      }).join('\n');

      const entities = await prisma.$queryRawUnsafe('SELECT type, name, diaryIds FROM graph_entities ORDER BY id DESC LIMIT 20');
      const graphSummary = entities.map(function(e) {
        var count = 0;
        try { count = JSON.parse(e.diaryIds || '[]').length; } catch {}
        return '[' + e.type + '] ' + e.name + '（关联' + count + '篇日记）';
      }).join('\n');

      var msgsSlice = msgs.slice(-10);
      var historyLines = msgsSlice.map(function(m) {
        return (m.role === 'user' ? '用户' : 'AI树洞') + '：' + m.content;
      });
      var history = historyLines.join('\n');

      var diaryText = diarySummary || '(暂无日记数据)';
      var graphText = graphSummary || '(暂无实体数据)';

      var systemPrompt = '你是一个温暖的 AI 树洞，用户的私人对话伙伴。你有以下数据源：\n' +
  '1. 用户最近的日记内容：\\n' + diaryText + '\\n' +
  '2. 用户的知识图谱实体：\\n' + graphText + '\\n' +
  '3. 对话历史：\\n' + history + '\\n\\n' +
  '规则：\\n' +
  '- 用温暖、朋友般的语气回应用户\\n' +
  '- 基于真实日记数据说话，不凭空猜测\\n' +
  '- 可以主动提问引导用户深入话题\\n' +
  '- 回复控制在 100-150 字，语言自然口语化\\n' +
  '- 可以适当使用 emoji\\n' +
  '- 如果用户提到日记中的内容，关联知识图谱数据';

      try {
        const config = await readLLMConfig();
        if (!config.apiKey) return { success: false, error: 'LLM 未配置，请先在设置中保存 API Key' };
        var knownUrls = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
        var url = knownUrls[config.activeProvider] ? knownUrls[config.activeProvider] : config.apiUrl;

        var msgsForApi = msgsSlice.map(function(m) {
          return { role: m.role, content: m.content };
        });

        var body = JSON.stringify({
          model: config.model,
          messages: [{ role: 'system', content: systemPrompt }].concat(msgsForApi),
          max_tokens: 1024
        });

        var apiUrlClean = url.replace(/\/+$/, '') + '/chat/completions';
        var res = await fetch(apiUrlClean, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
          body: body,
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
          var bd = await res.text().catch(function() { return ''; });
          return { success: false, error: 'AI HTTP ' + res.status + ': ' + bd.slice(0,200) };
        }
        var json = await res.json();
        var reply = json.choices?.[0]?.message?.content || '';

        msgs.push({ role: 'assistant', content: reply, createdAt: new Date().toISOString() });
        await prisma.$executeRawUnsafe(
          'UPDATE treehole_sessions SET messages = ?, updatedAt = ? WHERE id = ?',
          JSON.stringify(msgs), new Date(), input.sessionId
        );

        return { success: true, reply: reply };
      } catch (e) {
        return { success: false, error: e.message || 'AI 请求失败' };
      }
    }),

  // --- 新建对话 ---------------------
  newSession: t.procedure.mutation(async function() {
    var now = new Date();
    var title = now.getFullYear() + '-' +
      String(now.getMonth()+1).padStart(2,'0') + '-' +
      String(now.getDate()).padStart(2,'0') + ' 对话';
    await prisma.$executeRawUnsafe(
      'INSERT INTO treehole_sessions (title, messages, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      title, '[]', now, now
    );
    var rows = await prisma.$queryRawUnsafe(
      'SELECT id FROM treehole_sessions WHERE title = ? ORDER BY createdAt DESC LIMIT 1', title
    );
    return { id: rows[0].id, title: title };
  }),

  // --- 删除对话 ---------------------
  deleteSession: t.procedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async function({ input }) {
      await prisma.$executeRawUnsafe('DELETE FROM treehole_sessions WHERE id = ?', input.sessionId);
      return { success: true };
    }),
});

console.log('typeof app:', typeof app);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📝 Futao Logs running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/trpc`);
  console.log(`   Uploads: ${uploadDir}`);
  console.log(`   Exports: ${exportDir}`);
});
