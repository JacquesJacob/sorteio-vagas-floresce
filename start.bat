@echo off
cd /d "%~dp0"

set "NODE_EXE="

if exist "%~dp0runtime\node.exe" (
  set "NODE_EXE=%~dp0runtime\node.exe"
) else (
  where node >nul 2>nul
  if %errorlevel% equ 0 set "NODE_EXE=node"
)

if "%NODE_EXE%"=="" (
  echo Node.js nao encontrado.
  echo Instale o Node.js ou adicione node.exe na pasta runtime.
  pause
  exit /b 1
)

start "" http://localhost:3030
"%NODE_EXE%" server.js
