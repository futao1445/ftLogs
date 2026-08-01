# 暗色/亮色模式切换 — 视觉规范

**设计师**: miky
**日期**: 2026-07-29
**文件**: F:/other/ftLogs/design/theme-toggle-spec.md
**对接**: lamda 直接按此实现

---

## 1. 切换开关位置

导航栏右侧，和「写日记」按钮同行：

```
┌──────────────────────────────────────────────┐
│  ✏️ 日记  📅 日历  🔍 搜索        🌙  ＋写日记  │
│                                           ^^^^  │
│                                        主题切换  │
└──────────────────────────────────────────────┘
```

### 定位
| 属性 | 值 |
|------|----|
| 容器 | 导航栏右侧 flex 容器，与「写日记」btn 之间间距 `gap-3` |
| 对齐 | `items-center` 垂直居中 |
| 间距 | `ml-auto` 确保推到右侧 |

---

## 2. 切换按钮

### 图标式（推荐 — 简洁不占空间）

```
┌──────────┐        ┌──────────┐
│    ☀️    │        │    🌙    │
│  亮色模式 │   ←→   │  暗色模式 │
│          │        │          │
└──────────┘        └──────────┘
  当前暗色              当前亮色
  点击变亮              点击变暗
```

| 属性 | 值 |
|------|----|
| 图标 | 18x18px SVG（手写，非 emoji） |
| 大小 | 32x32px 可点击区域 |
| 圆角 | `rounded-lg` (8px) |
| 背景默认 | `transparent` |
| 背景 hover | `var(--bg-tertiary)` |
| 图标色 | `var(--text-secondary)` |
| 图标色 hover | `var(--text-primary)` |
| 过渡 | `all 150ms ease` |
| 提示 | `title="切换到{亮/暗}色模式"` |

### SVG 图标

#### 月亮（暗色模式图标 — 点击切换到亮色）
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>
```

#### 太阳（亮色模式图标 — 点击切换到暗色）
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1" x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1" y1="12" x2="3" y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>
```

---

## 3. 切换逻辑

### CSS 方式（推荐 — 零依赖）

```ts
// 读取当前主题
const getTheme = (): 'dark' | 'light' => {
  return document.documentElement.getAttribute('data-theme') || 'dark';
};

// 设置主题
const setTheme = (theme: 'dark' | 'light') => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('futao-logs-theme', theme);
};

// 初始化（在页面加载时）
const saved = localStorage.getItem('futao-logs-theme');
if (saved) {
  document.documentElement.setAttribute('data-theme', saved);
}
```

### 存储
- 使用 `localStorage` 持久化（key: `futao-logs-theme`）
- 默认值：`'dark'`（与 futao-homepage 保持一致）
- 页面加载时从 localStorage 读取，无记录则保持 dark

### 切换按钮行为
```
点击 🌙(暗色模式) → data-theme="light" → 图标变 ☀️ → 页面变亮色
点击 ☀️(亮色模式) → data-theme="dark"  → 图标变 🌙 → 页面变暗色
```

---

## 4. 亮色模式验证清单

### 自动生效（tokens.css 已有变量）
以下组件使用 tokens.css 变量，切换 `data-theme` 自动变：
- ✅ 页面背景 (`--bg-primary`)
- ✅ 卡片背景 (`--bg-secondary`)
- ✅ 文字色 (`--text-primary/secondary/tertiary`)
- ✅ 边框 (`--border-default/hover`)
- ✅ 阴影 (`--shadow-card`)
- ✅ 主色调 (`--accent`)
- ✅ 弹窗背景 (`--bg-elevated`)

### 需要确认亮色表现
- ✅ 空状态叶子 SVG（描边色 `var(--accent)` → 自动适配）
- ✅ 心情色日历圆点（固定色值 → 不受主题影响，保留原始 mood 色）
- ✅ 标签胶囊（背景 `var(--accent-soft)` → 自动适配）
- ✅ Toast 提示（文字 `var(--text-primary)` → 自动适配）
- ✅ 加载 Skeleton（背景 `var(--bg-tertiary)` → 自动适配）
- ✅ 搜索高亮（`var(--accent)` → 自动适配）

### 需要单独检查
- 导航栏 `backdrop-blur` 背景混合（亮色模式下 `color-mix(in srgb, var(--bg-primary) 80%, transparent)` → 自动适配）
- 「写日记」按钮文字色（硬编码 `#0f1a12` → 亮色模式下需要验证。亮色 bg-primary 是 `#f5f2ed`，按钮 accent 是 `#16a34a`，白色文字可能更合适）

### 修复项
1. **「写日记」按钮文字色** — 改为 `var(--accent-text)` 替代硬编码 `#0f1a12`
2. **DiaryEditor.tsx:454 标签选中态** — `color: sel ? '#fff' : 'var(--accent)'` 中的 `#fff` 改为 `var(--accent-text)`（亮色模式下标签背景可能是浅色，白色可能看不清）
3. **所有硬编码色值** — 检查 `#0f1a12`（按钮文字）和 `#fff`（标签选中态文字），统一用 CSS 变量

建议：按钮文字统一用 `#ffffff`（暗色模式下 accent 绿 `#4ade80` 配白色可读，亮色模式下 `#16a34a` 配白色也可读）。改 tokens.css：

```css
/* 改前 */
color: '#0f1a12';
/* 改后 - 使用 CSS 变量 */
color: var(--btn-text, #0f1a12);
```
或者直接在亮色模式覆盖：
```css
[data-theme="light"] {
  --btn-text: #ffffff;
}
```

建议：按钮文字统一用 `#ffffff`（暗色模式下 accent 绿 `#4ade80` 配白色可读，亮色模式下 `#16a34a` 配白色也可读）。改 tokens.css：

```
/* 新增 */
--accent-text: #ffffff;
```

在「写日记」按钮和其他 accent 背景按钮中使用 `color: var(--accent-text)` 替代硬编码。

---

## 5. 开发优先级

1. **加 CSS 变量** — tokens.css 新增 `--accent-text: #ffffff`
2. **主题切换逻辑** — PageShell 顶栏 + localStorage 持久化
3. **「写日记」按钮文字色改变量** — `color: var(--accent-text)`
4. **PageShell 中集成 toggle** — 图标 + 切换函数
5. **验证亮色模式** — 逐页检查所有组件

---

## 6. 暗色模式无关事项

- 日记卡片心情色圆点 — 使用固定颜色映射，不受主题影响
- 标签颜色 — 使用标签本身的 color 属性，不受主题影响
- SVG 图标色 — 使用 `currentColor` 继承文字色 → 自动适配
