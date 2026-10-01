@echo off
chcp 65001 >nul
title Your Journey Awaits - 公网共享
set PORT=8000

netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul
if errorlevel 1 (
  echo [1/2] 启动本地游戏服务...
  start /min python -m http.server %PORT% --directory "%~dp0"
  timeout /t 2 /nobreak >nul
)

echo.
echo ==================================================
echo   [2/2] 正在创建公网隧道，请稍等几秒...
echo.
echo   成功后上方会显示一个 https://xxxx.lhr.life 网址
echo   把这个网址发给任何人，手机/电脑浏览器都能玩
echo.
echo   注意：这个网址是临时的，需要保持本窗口打开
echo   电脑关机后网址就失效（永久网址请看 README）
echo ==================================================
echo.

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:localhost:%PORT% nokey@localhost.run
echo.
echo 隧道已断开。按任意键关闭窗口...
pause >nul
