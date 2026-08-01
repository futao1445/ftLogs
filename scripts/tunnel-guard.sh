#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  心跳隧道 — 掉线自动恢复守护脚本（落地交付物，2026-08-01）
#  用法: bash tunnel-guard.sh [url] [间隔秒] [连续失败次数阈值]
#  作用: 持续探测 URL，连续 N 次失败 → 自动重启 cloudflared 隧道
#  依赖: start-tunnel.bat 同目录；cloudflared 在 PATH
# ═══════════════════════════════════════════════════════════════

URL="${1:-https://passport-dubai-science-earning.trycloudflare.com}"
INTERVAL="${2:-10}"        # 探测间隔秒
FAIL_THRESHOLD="${3:-3}"   # 连续失败多少次触发重启
DIR="$(cd "$(dirname "$0")" && pwd)"
LOGFILE="$DIR/tunnel-guard.log"

echo "[guard] 监控: $URL"
echo "[guard] 间隔: ${INTERVAL}s, 连续失败阈值: ${FAIL_THRESHOLD}, 日志: $LOGFILE"

fail=0
while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "$URL" 2>/dev/null)
  ts=$(date +%H:%M:%S)

  if [ "$code" = "200" ]; then
    fail=0
    echo "$ts OK  (fail=0)" >> "$LOGFILE"
  else
    fail=$((fail + 1))
    echo "$ts FAIL code=${code:-timeout} (fail=$fail/$FAIL_THRESHOLD)" >> "$LOGFILE"
    if [ "$fail" -ge "$FAIL_THRESHOLD" ]; then
      echo "$ts [RESTART] 连续 ${fail} 次失败，重启隧道..." >> "$LOGFILE"
      # 结束所有现有 cloudflared（避免端口/进程冲突）
      tasklist //FI "IMAGENAME eq cloudflared.exe" 2>/dev/null | grep -i cloudflared >/dev/null
      if [ $? -eq 0 ]; then
        taskkill //F //IM cloudflared.exe >/dev/null 2>&1
        echo "$ts [RESTART] 已结束旧 cloudflared 进程" >> "$LOGFILE"
        sleep 3
      fi
      # 用心跳参数重启（start-tunnel.bat 的封装）
      if [ -f "$DIR/start-tunnel.bat" ]; then
        (cd "$DIR" && cmd //c start "" start-tunnel.bat) >> "$LOGFILE" 2>&1
      else
        nohup cloudflared tunnel --url http://127.0.0.1:1111 --no-autoupdate --protocol http2 --edge-ip-version 4 --heartbeat-interval 1s --retries 100 --grace-period 5s >> "$LOGFILE" 2>&1 &
      fi
      echo "$ts [RESTART] 隧道已重启，等待新 URL 上线..." >> "$LOGFILE"
      fail=0
      sleep 20   # 给隧道建立时间
    fi
  fi
  sleep "$INTERVAL"
done
