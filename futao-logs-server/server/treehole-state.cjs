// 树洞 AI 思考/保存进度状态（进程内共享单例，combined.cjs 与 treehole-router.cjs 共用）
// 用途：
//   thinking  — ask 正在调用 LLM 时 true，前端轮询显示「对方正在输入中...」
//   saving    — saveToKnowledgeBase 入库中 true（入库本身很快，主要反馈靠 summary）
//   summaries — 保存为知识库流程里 summarizeSession 的摘要任务状态
//               status: idle | processing | done | error
const state = {
  thinking: {},   // { [sessionId]: boolean }
  saving: {},     // { [sessionId]: boolean }
  summaries: {},  // { [sessionId]: { status, summary?, error?, startedAt?, finishedAt? } }
};

function setThinking(sessionId, v) { state.thinking[String(sessionId)] = !!v; }
function isThinking(sessionId) { return !!state.thinking[String(sessionId)]; }

function setSaving(sessionId, v) { state.saving[String(sessionId)] = !!v; }
function isSaving(sessionId) { return !!state.saving[String(sessionId)]; }

function setSummaryStatus(sessionId, status, extra) {
  const prev = state.summaries[String(sessionId)] || {};
  state.summaries[String(sessionId)] = Object.assign({}, prev, extra || {}, { status });
}
function getSummaryStatus(sessionId) {
  return state.summaries[String(sessionId)] || { status: 'idle' };
}

module.exports = {
  state,
  setThinking, isThinking,
  setSaving, isSaving,
  setSummaryStatus, getSummaryStatus,
};
