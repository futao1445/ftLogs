'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';

/* ─── Types ─── */
type Provider = 'deepseek' | 'kimi' | 'aliyun' | 'custom';

interface ProviderConfig {
  label: string;
  baseUrl: string;
  models: string[];
  customName?: string;
  customBaseUrl?: string;
}

const PROVIDER_MAP: Record<Provider, ProviderConfig> = {
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  kimi: { label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  aliyun: { label: '阿里云', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'] },
  custom: { label: '自定义', baseUrl: '', models: [] },
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
    model: all[cfgKey(p, 'model')] || PROVIDER_MAP[p].models[0],
  };
}

/* ─── Component ─── */
export default function LLMConfigSection() {
  const [provider, setProvider] = useState<Provider>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customName, setCustomName] = useState('');   // custom only
  const [customUrl, setCustomUrl] = useState('');       // custom only
  const [customModelInput, setCustomModelInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Load saved config on mount ──
  useEffect(() => {
    (async () => {
      try {
        const all = await api.configGetAll();
        // Read which provider is active
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
          setModel(cfg.model || PROVIDER_MAP[active as Provider].models[0]);
          setCustomName('');
          setCustomUrl('');
          setCustomModelInput('');
        }
      } catch { /* use defaults */ } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ── Switch provider ──
  const switchProvider = useCallback(async (p: Provider) => {
    setProvider(p);
    setTestResult(null);
    setSaved(false);
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
        setModel(cfg.model || PROVIDER_MAP[p].models[0]);
        setCustomName('');
        setCustomUrl('');
        setCustomModelInput('');
      }
    } catch {
      setApiKey('');
      if (p === 'custom') {
        setCustomName(''); setCustomUrl(''); setCustomModelInput('');
      } else {
        setModel(PROVIDER_MAP[p].models[0]);
      }
    }
  }, []);

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
      const testModel = provider === 'custom' ? (customModelInput || 'gpt-4o-mini') : (model || info.models[0]);
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
  }, [provider, apiKey, model, customUrl, customModelInput]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Save active provider
      await api.configSet('llm_provider_active', provider);
      // Save provider-specific config
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

      {/* Model */}
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
        ) : (
          <select
            value={model}
            onChange={(e) => { setModel(e.target.value); setTestResult(null); setSaved(false); }}
            className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors duration-150 cursor-pointer"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          >
            {info.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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
