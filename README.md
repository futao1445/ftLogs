# ftLogs

一款**卡片式的、随手记的个人日志软件**，从极简日记起步，逐步拓展为 AI + 知识库 + 桌宠联动的个人灵感系统。

> 📌 **项目状态**：Phase 1 极简卡片日志本已落地；涟漪页视觉重构验收通过（08-01）；Phase 2+（AI 辅助）进行中
> 👤 **使用场景**：个人使用 — 日常记录心情、想法、生活点滴，碎片化随手记

---

## ✨ 功能亮点

### 已落地（Phase 1 核心）
- **卡片日记** — 打开即写，首页 = 编辑区 + 卡片流，3 秒完成一篇
- **Markdown 编辑** — 标题、列表、粗斜体、引用等基础语法
- **图文混排** — 卡片中可插入图片
- **日历视图** — 日历模式预览日记内容，快速跳转到某一天
- **时间线列表** — 按时间倒序展示所有卡片
- **搜索** — 按关键词搜索日记内容
- **标签系统** — 为日记添加标签，按标签筛选
- **每日回顾** — 随机展示历史上的今天 / 随机一条旧日记
- **数据导出** — 导出为 Markdown / JSON
- **心情记录** — 每次记录可带心情标记，配心情统计图表
- **AI 总结** — 对日记内容做 AI 自动总结与分析
- **AI 树洞（静夜涟漪）** — 对话式情绪树洞，池塘涟漪沉浸式视觉
- **知识库** — 卡片记忆聚合视图
- **知识图谱** — 关系可视化
- **主题切换** — 暗色 / 亮色主题

### 规划中（Phase 2-6）
| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 2 | AI 辅助日志 — LLM API、自动总结、情绪分析、润色 | 🔄 进行中 |
| Phase 3 | 知识库 (RAG) — 向量化存储、语义搜索、关系发现、知识图谱 | 📋 规划 |
| Phase 4 | 长期记忆 — 跨会话记忆沉淀 | 📋 规划 |
| Phase 5 | 基础桌宠 | 📋 规划 |
| Phase 6 | AI 增强桌宠 | 📋 规划 |

---

## 🛠 技术栈

### 前端 `futao-logs-client/`
- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 4** — 原子化样式
- **tRPC v11** + **TanStack Query** — 类型安全 API 调用
- **framer-motion** — 动画
- **d3 / dagre** — 知识图谱可视化
- **react-markdown** — Markdown 渲染

### 后端 `futao-logs-server/`
- **Node.js** + **Express 4** + **tRPC v11**
- **Prisma ORM** + **SQLite**（本地优先，离线可用）
- **better-sqlite3** + **sqlite-vec** — 向量检索储备
- **busboy** — 图片上传

### 部署 / 运维
- **Cloudflare Tunnel**（trycloudflare）— 内网穿透，免费、无需域名
- 心跳保活 + 健康检查 + 自动守护（详见下方）

---

## 📁 目录结构

```
ftLogs/
├── futao-logs-client/     # 前端（React + Vite）
│   └── src/
│       ├── components/
│       │   ├── diary/          # 卡片日记
│       │   ├── calendar/       # 日历视图
│       │   ├── search/         # 搜索
│       │   ├── ai-summary/     # AI 总结
│       │   ├── treehole/       # AI 树洞（静夜涟漪）
│       │   ├── knowledge/      # 知识库
│       │   ├── knowledge-graph/# 知识图谱
│       │   ├── settings/       # 设置
│       │   └── pages/          # 页面容器
│       └── lib/                # API 客户端、类型
├── futao-logs-server/     # 后端（Express + Prisma + SQLite）
│   ├── server/
│   │   ├── combined.cjs       # 服务入口
│   │   ├── treehole-router.cjs# 树洞路由
│   │   ├── public/            # 前端构建产物 + 设计稿
│   │   └── uploads/           # 上传图片（运行时生成，不入库）
│   ├── prisma/                # Schema 与迁移
│   └── API.md                 # API 文档
├── docs/                  # 文档（需求、设计、质量、流程）
│   ├── design/               # 各功能设计稿 / spec
│   ├── workflow/             # 流程 / agent 状态机
│   ├── gantt-chart.html      # 甘特图
│   └── 需求文档-V1.1.md
├── research/              # 调研报告
├── scripts/               # 部署与运维脚本
│   ├── deploy.sh             # 一键部署
│   ├── start-tunnel.bat      # 心跳隧道启动
│   ├── check-tunnel.sh       # 隧道健康检查
│   └── tunnel-guard.sh       # 隧道自动守护
└── LOG/                   # 运行时日志（git 忽略）
```

---

## 🚀 快速开始（本地开发）

### 1. 安装依赖
```bash
cd futao-logs-client && npm install
cd ../futao-logs-server && npm install
```

### 2. 后端启动
```bash
cd futao-logs-server
npm run dev            # tsx watch（开发热重载）
# 或生产：npm start（node server/combined.cjs）
```
- 服务默认运行在 `http://localhost:1111`
- 健康检查：`GET /health`

### 3. 数据库
```bash
cd futao-logs-server
npm run db:push        # 同步 Prisma schema 到 SQLite
npm run db:studio      # 打开 Prisma Studio 可视化浏览数据
```

### 4. 前端启动
```bash
cd futao-logs-client
npm run dev            # Vite 开发服务器
```

---

## 📦 部署

### 一键部署（本地 → 服务器静态资源）
```bash
bash deploy.sh         # 在仓库根目录执行
```
自动完成：build 前端 → 拷贝 dist 到 server/public → 清理旧 bundle → 验证资源存在。

### 内网穿透（Cloudflare Tunnel）
项目无公网 IP，通过 Cloudflare 免费隧道对外提供访问：

| 脚本 | 作用 | 用法 |
|------|------|------|
| `scripts/start-tunnel.bat` | 启动带**心跳保活**的隧道 | 双击，或命令行执行 |
| `scripts/check-tunnel.sh` | 健康检查（探测 URL 是否 200） | `bash check-tunnel.sh [url] [间隔秒] [持续秒]` |
| `scripts/tunnel-guard.sh` | 掉线自动恢复守护 | `bash tunnel-guard.sh [url] [间隔秒] [失败阈值]` |

**心跳保活原理**：Cloudflare 空闲长连接约 60s 被静默掐断。通过 `--heartbeat-interval 1s` 保持活跃，配合 http2 协议、IPv4、重试 100 次，实测稳定运行 80s+ 不掉线（详见 `research/server-stability-research.md`）。

---

## 📚 文档索引

| 文档 | 位置 |
|------|------|
| 需求文档 V1.1 | `docs/需求文档-V1.1.md` |
| API 文档 | `futao-logs-server/API.md` |
| 质量验收标准 | `docs/quality-standards.md` |
| 测试用例 | `docs/test-cases-phase1.md` |
| 涟漪页设计稿 v5（基准） | `futao-logs-server/server/public/pond-ripple-complete-v5.html` |
| 甘特图 | `docs/gantt-chart.html` |
| 服务器稳定性调研 | `research/server-stability-research.md` |
| 免费域名调研 | `research/free-domain-research.md` |
| 开发流程 / 状态机 | `docs/workflow/` |

---

## 🔒 安全说明

- **运行时产物不入库**：`dev.db`、`.env`、`LOG/`、`uploads/`、`.pond-shots/` 等均在 `.gitignore` 排除
- **密钥不入库**：LLM API Key 等通过 `.env` 配置，不要提交到仓库
- **设计 Token**：`docs/design/tokens.css` 为「池塘涟漪」设计系统变量（NIGHT POND 10 色），非密钥

---

## 🗺 路线图

```
Phase 6 ─── AI 增强桌宠     ⭐⭐⭐ (第8-10周)
    ↑
Phase 5 ─── 基础桌宠        ⭐⭐ (第5-6周) ──┐
    ↑                                         │
Phase 4 ─── 长期记忆        ⭐⭐⭐⭐ (第5-7周)  ├─ 并行开发
    ↑                                         │
Phase 3 ─── 知识库(RAG)     ⭐⭐⭐ (第3-4周)  ──┘
    ↑
Phase 2 ─── AI 辅助日志     ⭐⭐ (第2周)  ← ★ 当前
    ↑
Phase 1 ─── 极简卡片日志本  ⭐ (第1周) ✅ 已落地
```
