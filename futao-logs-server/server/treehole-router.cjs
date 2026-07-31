const { z } = require('zod');
const thState = require('./treehole-state.cjs');

// AI 树洞 API Router
function createTreeholeRouter(t, prisma, readLLMConfig) {
  return t.router({
    // ─── 思考/保存进度状态（前端轮询：问「对方正在输入中...」/保存进度）───
    status: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => ({
        thinking: thState.isThinking(input.sessionId),
        saving: thState.isSaving(input.sessionId),
        summary: thState.getSummaryStatus(input.sessionId),
      })),

    sessions: t.procedure.query(async () => {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT id, title, updatedAt FROM treehole_sessions ORDER BY updatedAt DESC LIMIT 50'
      );
      return rows;
    }),

    messages: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const rows = await prisma.$queryRawUnsafe(
          'SELECT id, title, messages, createdAt FROM treehole_sessions WHERE id = ?',
          input.sessionId
        );
        if (!rows.length) return { error: '对话不存在' };
        const r = rows[0];
        let msgs;
        try { msgs = JSON.parse(r.messages); } catch { msgs = []; }
        return { id: r.id, title: r.title, messages: msgs };
      }),

    ask: t.procedure
      .input(z.object({ sessionId: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const rows = await prisma.$queryRawUnsafe(
          'SELECT id, title, messages FROM treehole_sessions WHERE id = ?',
          input.sessionId
        );
        if (!rows.length) return { success: false, error: '对话不存在' };
        const session = rows[0];
        let msgs;
        try { msgs = JSON.parse(session.messages); } catch { msgs = []; }

        msgs.push({ role: 'user', content: input.content, createdAt: new Date().toISOString() });

        // 进入思考态：前端轮询 treehole.status 显示「对方正在输入中...」
        thState.setThinking(input.sessionId, true);

        // 获取最近日记
        const recentDiaries = await prisma.$queryRawUnsafe(
          'SELECT content, date FROM diaries WHERE isArchived = 0 ORDER BY date DESC LIMIT 5'
        );
        const diarySummary = recentDiaries.map(function(d) {
          return '[' + d.date.toISOString().slice(0,10) + '] ' + d.content.slice(0,100);
        }).join('\n');

        // 获取知识图谱实体
        const entities = await prisma.$queryRawUnsafe(
          'SELECT type, name, diaryIds FROM graph_entities ORDER BY id DESC LIMIT 20'
        );
        const graphSummary = entities.map(function(e) {
          var count = 0;
          try { count = JSON.parse(e.diaryIds || '[]').length; } catch {}
          return '[' + e.type + '] ' + e.name + '（关联' + count + '篇日记）';
        }).join('\n');

        // 构建对话历史
        var historyLines = msgs.slice(-10).map(function(m) {
          return (m.role === 'user' ? '用户' : 'AI树洞') + '：' + m.content;
        });
        var history = historyLines.join('\n');

        var diaryText = diarySummary || '(暂无日记数据)';
        var graphText = graphSummary || '(暂无实体数据)';

        var systemPrompt =
          '你是一个温暖的 AI 树洞，用户的私人对话伙伴。你有以下数据源：\n' +
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
          var apiUrl = url.replace(/\/+$/, '') + '/chat/completions';

          var msgsForApi = msgs.slice(-10).map(function(m) {
            return { role: m.role, content: m.content };
          });

          var res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'system', content: systemPrompt }].concat(msgsForApi),
              max_tokens: 1024
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            var bd = await res.text().catch(function() { return ''; });
            return { success: false, error: 'AI HTTP ' + res.status + ': ' + bd.slice(0, 200) };
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
        } finally {
          thState.setThinking(input.sessionId, false);
        }
      }),

    newSession: t.procedure.mutation(async function() {
      var now = new Date();
      var title = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' 对话';
      await prisma.$executeRawUnsafe(
        'INSERT INTO treehole_sessions (title, messages, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
        title, '[]', now, now
      );
      var rows = await prisma.$queryRawUnsafe(
        'SELECT id FROM treehole_sessions WHERE title = ? ORDER BY createdAt DESC LIMIT 1',
        title
      );
      return { id: rows[0].id, title: title };
    }),

    deleteSession: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async function({ input }) {
        await prisma.$executeRawUnsafe('DELETE FROM treehole_sessions WHERE id = ?', input.sessionId);
        return { success: true };
      }),

    saveToKnowledgeBase: t.procedure
      .input(z.object({ sessionId: z.number().optional(), messageIndex: z.number().optional(), content: z.string() }))
      .mutation(async function({ input }) {
        var content = input.content;
        var source = 'treehole';

        if (!content && input.sessionId) {
          var rows = await prisma.$queryRawUnsafe(
            'SELECT messages FROM treehole_sessions WHERE id = ?', input.sessionId
          );
          if (!rows.length) return { success: false, error: '对话不存在' };
          var msgs;
          try { msgs = JSON.parse(rows[0].messages); } catch { msgs = []; }
          var idx = input.messageIndex !== undefined ? input.messageIndex : msgs.length - 1;
          if (idx < 0 || idx >= msgs.length) return { success: false, error: '消息索引超出范围' };
          content = msgs[idx].content;
        }

        if (!content) return { success: false, error: '内容为空' };

        // 入库处理中标记：前端 treehole.status 轮询可显示保存进度
        if (input.sessionId) thState.setSaving(input.sessionId, true);

        var now = new Date();
        var sid = String(input.sessionId || '');

        // Check if this session already has a knowledge entry
        var existing = await prisma.$queryRawUnsafe(
          'SELECT id FROM knowledge_entries WHERE sourceId = ? AND source = ? LIMIT 1',
          sid, source
        );

        var entryId;
        var isUpdate = false;
        if (existing.length > 0) {
          entryId = existing[0].id;
          isUpdate = true;
          // 保存内容到知识库，先清掉旧的实体关联再重新提取（内容变了）
          await prisma.$executeRawUnsafe(
            'UPDATE knowledge_entries SET content = ?, tags = ?, entityIds = ?, updatedAt = ? WHERE id = ?',
            content, '[]', '[]', now, entryId
          );
        } else {
          // Insert new entry
          await prisma.$executeRawUnsafe(
            'INSERT INTO knowledge_entries (content, source, sourceId, tags, entityIds, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            content, source, sid, '[]', '[]', now, now
          );
          var inserted = await prisma.$queryRawUnsafe(
            'SELECT id FROM knowledge_entries WHERE sourceId = ? AND source = ? LIMIT 1',
            sid, source
          );
          entryId = inserted[0].id;
        }

        // 保存后异步提取实体并关联图谱（不阻塞保存返回）
        if (typeof extractEntitiesFromText === 'function') {
          extractEntitiesFromText(content, { type: 'knowledge', id: entryId }).then(function(ext) {
            if (ext && ext.entityIds && ext.entityIds.length) {
              return prisma.$executeRawUnsafe(
                'UPDATE knowledge_entries SET entityIds = ? WHERE id = ?',
                JSON.stringify(ext.entityIds), entryId
              );
            }
          }).catch(function() {});
        }

        if (input.sessionId) thState.setSaving(input.sessionId, false);

        return { success: true, message: isUpdate ? '✅ 知识库已更新！' : '✅ 已保存到知识库！', isUpdate: isUpdate, id: entryId };
      }),

    summarizeSession: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async function({ input }) {
        // 摘要任务改为异步执行：立即返回 processing，前端轮询 treehole.status 显示进度
        // 完成态由后台任务写入 thState.summaries[sessionId]
        var rows = await prisma.$queryRawUnsafe(
          'SELECT messages FROM treehole_sessions WHERE id = ?', input.sessionId
        );
        if (!rows.length) return { success: false, error: '对话不存在' };
        var msgs;
        try { msgs = JSON.parse(rows[0].messages); } catch { msgs = []; }

        if (!msgs.length) return { success: false, error: '对话为空，无内容可总结' };

        var dialogueText = msgs.map(function(m) {
          return (m.role === 'user' ? '用户' : 'AI树洞') + '：' + m.content;
        }).join('\n\n');

        var summaryPrompt =
          '你是一个专业的对话摘要助手。请将以下对话内容提炼为关键信息点，整理成一份简洁的摘要。\n\n' +
          '要求：\n' +
          '- 只保留对用户有价值的核心信息（观点、感悟、计划、问题）\n' +
          '- 去除寒暄、冗余、重复内容\n' +
          '- 按主题分段，每段前用 **加粗小标题**\n' +
          '- 保留日记中提到的具体细节和情感倾向\n' +
          '- 语言简洁，总字数控制在 200-400 字\n' +
          '- 以纯文本返回，不要使用代码块或 JSON\n\n' +
          '对话内容：\n' + dialogueText;

        // 后台异步执行 LLM 摘要，状态写入 thState
        thState.setSummaryStatus(input.sessionId, 'processing', { startedAt: new Date().toISOString(), finishedAt: null, summary: null, error: null });
        (async function() {
          try {
            var config = await readLLMConfig();
            if (!config.apiKey) {
              thState.setSummaryStatus(input.sessionId, 'error', { error: 'LLM 未配置' });
              return;
            }
            var knownUrls = { deepseek: 'https://api.deepseek.com', kimi: 'https://api.moonshot.cn/v1', aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1' };
            var url = (knownUrls[config.activeProvider] || config.apiUrl).replace(/\/+$/, '') + '/chat/completions';

            var res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
              body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'system', content: summaryPrompt }],
                max_tokens: 1024
              }),
              signal: AbortSignal.timeout(30000),
            });

            if (!res.ok) {
              var bd = await res.text().catch(function() { return ''; });
              thState.setSummaryStatus(input.sessionId, 'error', { error: 'AI HTTP ' + res.status + ': ' + bd.slice(0, 200) });
              return;
            }
            var json = await res.json();
            var summary = json.choices?.[0]?.message?.content || '';

            if (!summary) {
              thState.setSummaryStatus(input.sessionId, 'error', { error: 'AI 返回为空' });
              return;
            }

            thState.setSummaryStatus(input.sessionId, 'done', { summary: summary, finishedAt: new Date().toISOString() });
          } catch (e) {
            thState.setSummaryStatus(input.sessionId, 'error', { error: e.message || 'AI 摘要请求失败', finishedAt: new Date().toISOString() });
          }
        })();

        // 立即返回 processing，由前端轮询 status 拿到 done/error
        return { success: true, status: 'processing', message: '正在生成摘要...' };
      }),
  });
}

module.exports = { createTreeholeRouter };
