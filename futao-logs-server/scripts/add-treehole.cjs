const fs = require('fs');
let c = fs.readFileSync('server/combined.cjs', 'utf8');

const treeholeCode = `

// ═══════════════════════════════════════════
// AI 树洞 API（聊天式 AI 助手）
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
        '1. 用户最近的日记内容：\n' + diaryText + '\n' +
        '2. 用户的知识图谱实体：\n' + graphText + '\n' +
        '3. 对话历史：\n' + history + '\n\n' +
        '规则：\n' +
        '- 用温暖、朋友般的语气回应用户\n' +
        '- 基于真实日记数据说话，不凭空猜测\n' +
        '- 可以主动提问引导用户深入话题\n' +
        '- 回复控制在 100-150 字，语言自然口语化\n' +
        '- 可以适当使用 emoji\n' +
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
`;

// Insert before appRouter
var insertPoint = c.indexOf('\n// ═══════════════════════════════════════════\n// 汇总路由');
c = c.slice(0, insertPoint) + treeholeCode + c.slice(insertPoint);

// Add treehole to appRouter
c = c.replace('  summary: summaryRouter,', '  summary: summaryRouter,\n  treehole: treeholeRouter,');

fs.writeFileSync('server/combined.cjs', c, 'utf8');
console.log('OK');
