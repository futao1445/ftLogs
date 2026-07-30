'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';

/* ─── Types ─── */
type Provider = 'deepseek' | 'kimi' | 'aliyun' | 'custom';

interface ProviderConfig {
  label: string;
  baseUrl: string;
}

interface ModelItem {
  id: string;
  ownedBy: string;
}

const PROVIDER_MAP: Record<Provider, ProviderConfig> = {
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  kimi: { label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1' },
  aliyun: { label: '阿里云', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  custom: { label: '自定义', baseUrl: '' },
};

/* ─── Config key helpers ─── */
function cfgKey(provider: Provider, field: string): string {
  return `llm_${provider}_${field}`;
}

function extractConfig(all: Record<string, any>, p: Provider) {
  if (p === 'custom') {
    return {
      name: all[cfgKey(p, 'name')] || '',
      baseUrl: all[cfgKey(p, 'api_url')] || '',
      apiKey: all[cfgKey(p, 'api_key')] || '',
      model: all[cfgKey(p, 'model')] || '',
    };
  }
  return {
    apiKey: all[cfgKey(p, 'api_key')] || '',
    model: all[cfgKey(p, 'model')] || '',
  };
}

export default function LLMConfigSection() {
  const [provider, setProvider] = useState<Provider>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customName, setCustomName] = useState('');   // custom only
  const [customUrl, setCustomUrl] = useState('');       // custom only
  const [customModelInput, setCustomModelInput] = useState('');

  const [models, setModels] = useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Fetch model list ──
  const fetchModels = useCallback(async (p: Provider, key: string) => {
    if (!key || p === 'custom') {
      setModels([]);
      setModelsError('');
      return;
    }
    setModelsLoading(true);
    setModelsError('');
    try {
      const result = await api.llmModels({
        provider: p,
        apiKey: key,
      });
      if (result.error) {
        setModelsError(result.error);
        setModels([]);
      } else {
        setModels(result.models || []);
        setModelsError('');
      }
    } catch {
      setModelsError('获取模型列表失败');
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // ── Load saved config on mount ──
  useEffect(() => {
    (async () => {
      try {
        const all = await api.configGetAll();
        const active = all.llm_provider_active || 'deepseek';
        setProvider(active as Provider);
        const cfg = extractConfig(all, active as Provider);
        setApiKey(cfg.apiKey);
        if (active === 'custom') {
          setCustomName(cfg.name);
          setCustomUrl(cfg.baseUrl);
          setModel('');
          setCustomModelInput(cfg.model);
        } else {
          setModel(cfg.model);
          await fetchModels(active as Provider, cfg.apiKey);
        }
      } catch { /* use defaults */ } finally {
        setLoaded(true);
      }
    })();
  }, [fetchModels]);

  // ── Switch provider ──
  const switchProvider = useCallback(async (p: Provider) => {
    setProvider(p);
    setTestResult(null);
    setSaved(false);
    setModels([]);
    setModelsError('');
    try {
      const all = await api.configGetAll();
      const cfg = extractConfig(all, p);
      setApiKey(cfg.apiKey);
      if (p === 'custom') {
        setCustomName(cfg.name);
        setCustomUrl(cfg.baseUrl);
        setModel('');
        setCustomModelInput(cfg.model);
      } else {
        setModel(cfg.model);
        setCustomName('');
        setCustomUrl('');
        setCustomModelInput('');
        await fetchModels(p, cfg.apiKey);
      }
    } catch {
      setApiKey('');
      if (p === 'custom') {
        setCustomName(''); setCustomUrl(''); setCustomModelInput('');
      } else {
        setModel('');
      }
    }
  }, [fetchModels]);

  // ── Test connection ──
  const handleTest = useCallback(async () => {
    const info = PROVIDER_MAP[provider];
    if (provider === 'custom') {
      if (!customUrl) { setTestResult({ success: false, message: '请填写 API 地址' }); return; }
      if (!apiKey) { setTestResult({ success: false, message: '请填写 API Key' }); return; }
    } else {
      if (!apiKey) { setTestResult({ success: false, message: '请填写 API Key' }); return; }
    }

    setTesting(true);
    setTestResult(null);
    try {
      const testUrl = provider === 'custom' ? customUrl : info.baseUrl;
      const testModel = provider === 'custom' ? (customModelInput || 'gpt-4o-mini') : (model || models[0]?.id || 'gpt-4o-mini');
      const result = await api.llmTest({
        apiUrl: testUrl.replace(/\/+$/, ''),
        apiKey,
        model: testModel,
      });
      if (result.success) {
        setTestResult({ success: true, message: `✅ 连接成功（${result.model}, 延迟 ${result.latency}ms）` });
      } else {
        setTestResult({ success: false, message: `❌ 连接失败：${result.error}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `❌ 连接失败：${e.message}` });
    } finally {
      setTesting(false);
    }
  }, [provider, apiKey, model, customUrl, customModelInput, models]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await api.configSet('llm_provider_active', provider);
      if (provider === 'custom') {
        await Promise.all([
          api.configSet(cfgKey(provider, 'name'), customName),
          api.configSet(cfgKey(provider, 'api_url'), customUrl),
          api.configSet(cfgKey(provider, 'api_key'), apiKey),
          api.configSet(cfgKey(provider, 'model'), customModelInput),
        ]);
      } else {
        await Promise.all([
          api.configSet(cfgKey(provider, 'api_key'), apiKey),
          api.configSet(cfgKey(provider, 'model'), model),
        ]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }, [provider, apiKey, model, customName, customUrl, customModelInput]);

  if (!loaded) return null;

  const info = PROVIDER_MAP[provider];
  const hasKey = provider === 'custom' ? !!apiKey && !!customUrl : !!apiKey;

  return (
    <div className="space-y-4">
      {/* Provider selector */}
      <Field label="平台">
        <select
          value={provider}
          onChange={(e) => switchProvider(e.target.value as Provider)}
          className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150 cursor-pointer"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        >
          {Object.entries(PROVIDER_MAP).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </Field>

      {/* 自定义：名称 + API 地址 */}
      {provider === 'custom' && (
        <>
          <Field label="名称">
            <input
              type="text"
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setTestResult(null); setSaved(false); }}
              placeholder="例：我的 OpenAI"
              className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />
          </Field>
          <Field label="API 地址">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => { setCustomUrl(e.target.value); setTestResult(null); setSaved(false); }}
              placeholder="https://api.openai.com/v1"
              className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />
          </Field>
        </>
      )}

      {/* 非自定义：固定 API 地址 */}
      {provider !== 'custom' && (
        <Field label="API 地址">
          <div
            className="w-full h-10 px-3 rounded-lg text-sm flex items-center select-none"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-default)',
            }}
          >
            {info.baseUrl}
          </div>
        </Field>
      )}

      {/* API Key */}
      <Field label="API Key">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setTestResult(null); setSaved(false); }}
          placeholder={`输入 ${info.label} API Key`}
          className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        />
      </Field>

      {/* 获取模型列表按钮（非自定义平台） */}
      {provider !== 'custom' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchModels(provider, apiKey)}
            disabled={!apiKey || modelsLoading}
            className="px-3 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer disabled:opacity-50"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {modelsLoading ? '获取中...' : models.length > 0 ? `📋 ${models.length} 个模型` : '📋 获取模型列表'}
          </button>
          {modelsError && (
            <span className="text-xs" style={{ color: '#ef4444' }}>获取失败，点击重试</span>
          )}
        </div>
      )}

      {/* Model — dynamic from API */}
      <Field label="模型">
        {provider === 'custom' ? (
          <input
            type="text"
            value={customModelInput}
            onChange={(e) => { setCustomModelInput(e.target.value); setTestResult(null); setSaved(false); }}
            placeholder="gpt-4o-mini"
            className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        ) : modelsLoading ? (
          <div
            className="w-full h-10 px-3 rounded-lg text-sm flex items-center"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-default)',
            }}
          >
            加载模型列表...
          </div>
        ) : modelsError ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={model}
              onChange={(e) => { setModel(e.target.value); setTestResult(null); setSaved(false); }}
              placeholder="手动输入模型名"
              className="flex-1 h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />
            <button
              onClick={() => fetchModels(provider, apiKey)}
              className="px-2 py-1 rounded-lg text-xs whitespace-nowrap"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
              title="重新获取"
            >
              刷新
            </button>
          </div>
        ) : models.length > 0 ? (
          <div className="flex gap-2">
            <select
              value={model && models.some(m => m.id === model) ? model : ''}
              onChange={(e) => { setModel(e.target.value); setTestResult(null); setSaved(false); }}
              className="flex-1 h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150 cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            >
              <option value="">-- 选择模型 --</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.id}</option>
              ))}
            </select>
            <button
              onClick={() => fetchModels(provider, apiKey)}
              className="px-2 py-1 rounded-lg text-xs whitespace-nowrap"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
              title="重新获取模型列表"
            >
              刷新
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={model}
            onChange={(e) => { setModel(e.target.value); setTestResult(null); setSaved(false); }}
            placeholder="保存 API Key 后自动获取模型列表"
            className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        )}
      </Field>

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {saving ? '保存中...' : saved ? '✅ 已保存' : '💾 保存'}
        </button>
        {saved && (
          <span className="text-xs" style={{ color: 'var(--accent)' }}>配置已保存</span>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className="text-xs py-2 px-3 rounded-lg"
          style={{
            background: testResult.success ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.08)',
            color: testResult.success ? 'var(--accent)' : '#ef4444',
          }}
        >
          {testResult.message}
        </div>
      )}
    </div>
  );
}

/* ─── Field wrapper ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}
