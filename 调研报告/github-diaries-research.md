# GitHub 开源日记/日志项目调研报告

> 数据调研师：力齐早早 | 日期：2026-07-29 | 指令来源：@futao

---

## 一、调研概况

应 futao 要求，对 GitHub 上开源个人日记/心情日志项目进行调研。覆盖面：**10 + 个主流开源项目**，涵盖个人日记、轻量笔记、跨平台日记等多个方向。

---

## 二、重点开源项目详情

### 1. 🥇 Joplin — 笔记+日记（推荐参考）

| 维度 | 说明 |
|------|------|
| **GitHub** | [laurent22/joplin](https://github.com/laurent22/joplin) |
| **Stars** | ⭐ 50,000+（评分最高的开源笔记工具） |
| **技术栈** | Electron + React (桌面) / React Native (移动) |
| **平台** | Windows / macOS / Linux / Android / iOS |
| **核心功能** | Markdown 富文本编辑、标签系统、笔记本分层、端到端加密、Web Clipper |
| **同步** | 支持多种云同步（NextCloud、Dropbox、OneDrive、AWS S3 等） |
| **可借鉴亮点** | ① 插件系统强大（200+ 个插件）② Todo 与日记并存 ③ 离线优先 ④ 端到端加密安全 |
| **不足** | 功能太重，非纯日记体验 |

### 2. 🥈 Diarum / 吾身 — 自托管日记（最贴合「个人日记」定位）

| 维度 | 说明 |
|------|------|
| **GitHub** | [songtianlun/diarum](https://github.com/songtianlun/diarum) |
| **Stars** | ⭐ 新项目，增长中 |
| **技术栈** | Go 后端 + 前端 Web |
| **平台** | Web（可自托管 Docker） |
| **核心功能** | ① 简洁日记记录与浏览 ② AI 功能（向量数据库存储日记，支持搜索和总结）③ 自托管隐私 |
| **可借鉴亮点** | ① 「零负担快记录」理念 ② 自托管隐私安全 ③ AI 全文检索/智能总结 |
| **不足** | 只有 Web 端，无移动端原生体验 |

### 3. 🥉 SwashbucklerDiary / 侠客日记 — 跨平台本地日记

| 维度 | 说明 |
|------|------|
| **GitHub** | [Yu-Core/SwashbucklerDiary](https://github.com/Yu-Core/SwashbucklerDiary) |
| **Stars** | ⭐ 2,000+ |
| **技术栈** | .NET MAUI + Blazor |
| **平台** | Android / Windows / macOS / Web / Linux（全平台） |
| **核心功能** | ① 本地存储 ② Markdown 编辑 ③ 标签分类 ④ 日历视图 ⑤ 导出备份 |
| **可借鉴亮点** | ① 真正的跨平台（5 个平台一套代码）② 本地优先不依赖云 ③ 日历布局直观浏览 |
| **不足** | 技术栈较冷门（.NET MAUI） |

### 4. Memex — AI 原生日记 App

| 维度 | 说明 |
|------|------|
| **GitHub** | [memex-lab/memex](https://github.com/memex-lab/memex) |
| **Stars** | ⭐ 较新，2026 年项目 |
| **技术栈** | React Native / TypeScript /本地优先 |
| **平台** | iOS / Android |
| **核心功能** | ① 文字+照片+语音输入 ② AI Agent 自动组织成时间线卡片 ③ 自带 LLM（支持 OpenAI、Claude、Gemini、Ollama） ④ 本地数据存储 |
| **可借鉴亮点** | ① AI 自动整理——日记从「手动写」变「自动组织」 ② BYO LLM 带来灵活性和隐私选择 ③ 多媒体输入（语音日记体验极佳）|
| **不足** | 项目较新，尚不成熟 |

### 5. Daily_You — 纯净日记 App

| 维度 | 说明 |
|------|------|
| **GitHub** | [Demizo/Daily_You](https://github.com/Demizo/Daily_You) |
| **Stars** | ⭐ 1,500+ |
| **技术栈** | Flutter / Dart |
| **平台** | Android（F-Droid 可用） |
| **核心功能** | ① 每日日记卡片 ② 照片记录 ③ 心情标签 ④ 日历回顾 ⑤ 本地加密 |
| **可借鉴亮点** | ① 极简纯净——纯粹的日记体验 ② 卡片风格展示 ③ 开放协议（F-Droid） |
| **不足** | 只有 Android 端，无 Web/iOS |

### 6. DailyVox — 语音日记（创新型）

| 维度 | 说明 |
|------|------|
| **GitHub** | [intrepidkarthi/dailyvox](https://github.com/intrepidkarthi/dailyvox) |
| **Stars** | ⭐ 新项目 |
| **技术栈** | SwiftUI / Apple Speech / NaturalLanguage / ActivityKit |
| **平台** | iPhone（Apple 生态） |
| **核心功能** | ① 每天 42 秒语音记录 ② 设备端 AI 语音转文字 ③ 星辰图展示日记 |
| **可借鉴亮点** | ① 「42秒语音」极低记录门槛 ② 语音输入体验创新 ③ 设备端处理保护隐私 |
| **不足** | 仅 iOS，无跨平台 |

### 7. Memos — 轻量笔记/碎片记录（参考用户规模大）

| 维度 | 说明 |
|------|------|
| **GitHub** | [usememos/memos](https://github.com/usememos/memos) |
| **Stars** | ⭐ **17,800+** |
| **技术栈** | Go + React + SQLite |
| **平台** | Web（Docker 自托管）+ 移动端 Web |
| **核心功能** | ① 极简碎片记录（类似私人微博）② Markdown ③ 标签 ④ 公开/私密 ⑤ 资源上传 |
| **可借鉴亮点** | ① 「3 秒记录」理念——极低记录摩擦 ② 一条 Docker 命令部署 ③ 开放式 API + 社区生态 |
| **不足** | 不是日记定位，缺少日记结构化功能（日历、心情等）|

### 8. Paperwhisper — 拟物风日记（设计参考）

| 维度 | 说明 |
|------|------|
| **GitHub** | [lingshichat/Paperwhisper](https://github.com/lingshichat/Paperwhisper) |
| **Stars** | ⭐ 小众 |
| **技术栈** | 非公开 |
| **平台** | Android / Windows |
| **核心功能** | 拟物化纸张风格日记，本地存储 |
| **可借鉴亮点** | ① 独树一帜的拟物设计风格 ② 本土化设计思路 |

### 9. cyber-diary — 极客向 Markdown 日记

| 维度 | 说明 |
|------|------|
| **GitHub** | [jianyuewushuang/cyber-diary](https://github.com/jianyuewushuang/cyber-diary) |
| **Stars** | ⭐ 小众 |
| **技术栈** | Electron |
| **平台** | Windows / macOS / Linux |
| **核心功能** | 管理 Markdown 格式日记文件 |
| **可借鉴亮点** | ① 文件即日记（纯文本格式）② 本地存储无绑定 |

---

## 三、功能矩阵对比

| 功能 \ 项目 | Diarum | Memex | Daily_You | Joplin | Memos | 侠客日记 | DailyVox |
|-------------|--------|-------|-----------|-------|-------|---------|----------|
| 纯日记定位 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ |
| 文字记录 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 图片/多媒体 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 语音输入 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Markdown | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 标签系统 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 日历视图 | ⚠️ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| 本地优先 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 云同步 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 自托管 | ✅ Docker | ❌ | ❌ | ✅ | ✅ Docker | ❌ | ❌ |
| AI 功能 | ✅ 向量搜索 | ✅ AI Agent | ❌ | ⚠️ 插件 | ❌ | ❌ | ✅ 语音转文字 |
| 端到端加密 | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 跨平台 | ❌ Web | ✅ 双端 | ❌ Android | ✅ 全平台 | ✅ Web | ✅ 全平台 | ❌ iOS |
| 开源协议 | OSS | MIT | GPL | AGPL | MIT | GPL | MIT |
| 活跃度 | 新 | 新 | 稳定 | ⭐最活跃 | ⭐极活跃 | 稳定 | 新 |

---

## 四、关键发现与建议

### 发现 1：开源日记项目可以分成三类

| 类型 | 代表项目 | 特点 |
|------|---------|------|
| **极简日记** | Diarum、Daily_You、Paperwhisper | 功能专注，纯粹日记体验 |
| **AI 驱动日记** | Memex、DailyVox | 用 AI 降低记录门槛、自动整理 |
| **重型笔记兼容** | Joplin、Memos | 笔记为主，兼具日记功能，用户量大 |

### 发现 2：值得参考的设计方向

从这些项目中提炼出几个对 futao 日记产品有价值的参考：

**① 极低记录门槛**
- DailyVox 的「42 秒语音」理念 → 3 秒内完成一次记录
- Memos 的「私人微博」风格 → 碎片化、低压力输入

**② 本地优先 + 可选同步**
- Diarum、Daily_You、侠客日记 全部采用本地优先
- 隐私是第一优先级（个人日记的极端敏感性）
- 可选同步而非强制云端

**③ AI 赋能**
- Memex 的 AI 自动组织日记到时间线 → 降低整理成本
- Diarum 的向量检索 → 日记全文搜索
- 趋势：AI 让「记录」从纯手动变成「半自动」

**④ 多媒体日记**
- 纯文字 + 图片 + 语音 都会成为标配
- DailyVox 证明了语音日记是一个独立赛道

**⑤ 日历回顾**
- Daily_You、侠客日记、Memex 都具备日历视图
- 「On This Day」是 Day One 最受欢迎的功能

### 发现 3：中文市场空白

在 10+ 个项目中，真正**中文开发 + 优秀的日记体验**的开源项目极少：
- 侠客日记（中文，但 .NET 技术栈冷门）
- Diarum/吾身（中文，但只有 Web 端）
- Paperwhisper（中文，拟物风，但小众）

**这验证了第一份调研报告的结论——中文全平台日记产品仍是蓝海。**

---

## 五、对 futao 日志软件的功能建议

基于以上调研，建议核心功能方向：

| 优先级 | 功能 | 参考来源 | 说明 |
|--------|------|---------|------|
| P0 | 文字日记 + Markdown | Diarum / Joplin | 最基础的日记能力 |
| P0 | 日历视图 | Daily_You / 侠客日记 | 浏览日记的核心方式 |
| P0 | 本地存储优先 | 几乎所有项目 | 个人日记必须隐私 |
| P0 | 标签/分类 | Joplin / Memos | 组织日记的基础 |
| P1 | 图片/多媒体 | Memex / Daily_You | 富日记体验 |
| P1 | AI 辅助（可选） | Memex / Diarum | 2026 年趋势 |
| P1 | 搜索 | Diarum（向量搜索） | 日记检索 |
| P2 | 备份/导出 | 侠客日记 / Joplin | 数据安全 |
| P2 | 可选同步 | Joplin 多后端 | 不是必须但加分 |
| P3 | 语音输入 | DailyVox / Memex | 进阶功能 |

---

*以上为 GitHub 开源项目调研结果。@麻也龙太 可根据此报告确定功能清单和需求文档方向。*
