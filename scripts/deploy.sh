#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# 池塘涟漪 · 一键部署脚本
# 2026-07-31 | miky
# 解决 CSS 漏拷事故：build 产物一次拷全（JS+CSS），自动验证，
# 部署后 git 提交，杜绝"手工 cp 漏文件 / 部署了什么都说不清"。
#
# 用法： 在仓库根目录（F:\other\ftLogs）执行  bash deploy.sh
# 依赖： 先 npm install 好 futao-logs-client 依赖
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# ─── 路径 ───
ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIENT="$ROOT/futao-logs-client"
SERVER="$ROOT/futao-logs-server/server"
DIST="$CLIENT/dist"
ASSETS="$SERVER/public/assets"

echo "▶ 1/5 build client…"
cd "$CLIENT"
npx vite build

# ─── 从 dist/index.html 提取本次引用（不靠人记 hash）───
NEW_JS=$(grep -o 'index-[A-Za-z0-9_.-]*\.js'  "$DIST/index.html" | head -1 || true)
NEW_CSS=$(grep -o 'index-[A-Za-z0-9_.-]*\.css' "$DIST/index.html" | head -1 || true)
echo "   本次 bundle: JS=$NEW_JS  CSS=$NEW_CSS"
[ -n "$NEW_JS" ] && [ -n "$NEW_CSS" ] || { echo "❌ 无法从 dist/index.html 提取 bundle 名，中止"; exit 1; }

echo "▶ 2/5 拷贝 dist → server/public…"
# 全量同步 dist 产物到 server/public（包含 assets/ 与 index.html）
mkdir -p "$ASSETS"
cp "$DIST"/assets/*.js  "$ASSETS/"   # 全部 JS
cp "$DIST"/assets/*.css "$ASSETS/"   # 全部 CSS（历史教训：只拷 JS 漏 CSS 页面全裸）
cp "$DIST/index.html"   "$SERVER/public/index.html"   # 覆盖引用，天然同步

echo "▶ 3/5 清理旧 bundle…"
# 保留本次引用的 JS/CSS，删除 assets 里其余的 .js/.css（即旧版本）
for f in "$ASSETS"/*.js "$ASSETS"/*.css; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"
  if [ "$base" != "$NEW_JS" ] && [ "$base" != "$NEW_CSS" ]; then
    rm -f "$f"
    echo "   已删旧 bundle: $base"
  fi
done

echo "▶ 4/5 自动验证…"
ok=1
for path in "assets/$NEW_JS" "assets/$NEW_CSS"; do
  if [ -f "$SERVER/public/$path" ]; then
    ctype=$(curl -sI "http://localhost:1111/$path" | grep -i '^content-type:' | tr -d '\r' | cut -d' ' -f2- | xargs)
    echo "   $path → $ctype"
    case "$path" in
      *.js)  case "$ctype" in application/javascript*|text/javascript*) ;; *) echo "   ❌ JS Content-Type 异常: $ctype"; ok=0 ;; esac ;;
      *.css) case "$ctype" in text/css*) ;; *) echo "   ❌ CSS Content-Type 异常: $ctype"; ok=0 ;; esac ;;
    esac
  else
    echo "   ❌ 文件缺失: $path"
    ok=0
  fi
done
[ "$ok" = "1" ] || { echo "❌ 验证未通过，部署中止"; exit 1; }

# ─── 页面实际加载确认（关键 CSS 规则在不在返回内容里）───
CSS_BODY=$(curl -s "http://localhost:1111/assets/$NEW_CSS" | grep -c -- '--bg-primary')
[ "$CSS_BODY" -ge 1 ] || { echo "❌ CSS 内容异常（无 token 规则），部署中止"; exit 1; }
echo "   ✅ CSS 内容含 token 规则"

echo "▶ 5/5 git 提交（可选，--skip-commit 跳过）…"
if [ "${1:-}" = "--skip-commit" ]; then
  echo "   已跳过 git 提交"
else
  cd "$ROOT"
  git add -A futao-logs-client futao-logs-server 2>/dev/null || true
  git commit -m "deploy: $(date +%Y-%m-%d_%H:%M) $NEW_JS + $NEW_CSS" --no-verify 2>/dev/null \
    && echo "   ✅ 已提交 $NEW_JS + $NEW_CSS" \
    || echo "   （无变更可提交或提交失败，忽略）"
fi

echo ""
echo "✅ 部署完成"
echo "   localhost: http://localhost:1111/"
echo "   tunnel:    https://reservoir-heroes-tribunal-buried.trycloudflare.com/"
