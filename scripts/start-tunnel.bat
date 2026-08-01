@echo off
REM ═══════════════════════════════════════════════════════════════
REM  夏荷/日志项目 — 一键启动 Cloudflare 心跳隧道
REM  futao-logs 服务器稳定性 · 落地交付物（2026-08-01）
REM
REM  用法：双击运行，或命令行执行  start-tunnel.bat
REM  依赖：cloudflared 已在 PATH 或下方指定路径
REM ═══════════════════════════════════════════════════════════════

setlocal

REM ── 可配置区 ──
set CLOUDFLARED_EXE=cloudflared
set ORIGIN_URL=http://127.0.0.1:1111
set LOG_FILE=%~dp0tunnel-hb.log

REM ── 心跳参数（核心：防 60s 静默掉线，来自 lamda 实战验证）──
set HEARTBEAT=--heartbeat-interval 1s
set PROTO=--protocol http2
set IPV4=--edge-ip-version 4
set RETRIES=--retries 100
set GRACE=--grace-period 5s

echo [INFO] 启动 Cloudflare 心跳隧道
echo [INFO] 目标: %ORIGIN_URL%
echo [INFO] 日志: %LOG_FILE%
echo.

REM 如果已有一个隧道在跑（同一进程），先提示不要重复启动
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr /I "cloudflared" >nul
if %errorlevel%==0 (
  echo [WARN] 检测到已有 cloudflared 进程。如果它已经带心跳参数，无需重复启动。
  echo [WARN] 若要强制重启，请先结束旧进程再运行本脚本。
)

echo [RUN] %CLOUDFLARED_EXE% tunnel --url %ORIGIN_URL% --no-autoupdate %PROTO% %IPV4% %HEARTBEAT% %RETRIES% %GRACE%
%CLOUDFLARED_EXE% tunnel --url %ORIGIN_URL% --no-autoupdate %PROTO% %IPV4% %HEARTBEAT% %RETRIES% %GRACE% 2>&1 | tee %LOG_FILE%

endlocal
