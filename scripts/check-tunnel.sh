#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Cloudflare 心跳隧道 — 健康检查脚本（落地交付物，2026-08-01）
#  用法: bash check-tunnel.sh [url] [间隔秒] [持续秒]
#  例:   bash check-tunnel.sh https://passport-dubai-science-earning.trycloudflare.com 5 1800
#  输出: stdout 每次探测结果；退出码 0=全程稳定 1=出现掉线
# ═══════════════════════════════════════════════════════════════

URL="${1:-https://passport-dubai-science-earning.trycloudflare.com}"
INTERVAL="${2:-5}"        # 探测间隔秒
DURATION="${3:-1800}"     # 持续探测秒数（默认 30 分钟）
DIR="$(cd "$(dirname "$0")" && pwd)"
# 日志统一写到仓库根 LOG/（futao 14:24 指令：所有 .log 用 LOG 文件夹存起来）
LOGFILE="$DIR/../LOG/tunnel-check-$(date +%Y%m%d-%H%M%S).log"

echo "[check] 目标: $URL"
echo "[check] 间隔: ${INTERVAL}s, 持续: ${DURATION}s, 日志: $LOGFILE"

fail=0
total=0
end=$(( $(date +%s) + DURATION ))
while [ "$(date +%s)" -lt "$end" ]; do
  total=$((total + 1))
  ts=$(date +%H:%M:%S)
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "$URL" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "$ts OK  $code" | tee -a "$LOGFILE"
  else
    fail=$((fail + 1))
    echo "$ts FAIL code=${code:-timeout}" | tee -a "$LOGFILE"
  fi
  sleep "$INTERVAL"
done

echo "========================================"
echo "[check] 完成: 掉线 $fail 次 / 共 $total 次探测"
if [ "$fail" -eq 0 ]; then
  echo "[check] 结论: 心跳隧道稳定 ✅"
  exit 0
else
  echo "[check] 结论: 出现掉线，需要重启或换方案 ⚠️"
  exit 1
fi
