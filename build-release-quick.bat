@echo off
chcp 65001 >nul
echo ========================================
echo   Build Release AAB (RAPIDO)
echo ========================================
echo.

set BUILD_GRADLE=%~dp0android\app\build.gradle
set GRADLEW=%~dp0android\gradlew.bat
set INCREMENT_SCRIPT=%~dp0increment-version.ps1

REM Adicionar Node.js ao PATH
set PATH=C:\nvm4w\nodejs;%PATH%

powershell -ExecutionPolicy Bypass -File "%INCREMENT_SCRIPT%" -BuildGradlePath "%BUILD_GRADLE%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Erro ao atualizar a versao!
    pause
    exit /b 1
)

echo [3/3] Gerando AAB de release (sem clean)...
echo.
call "%GRADLEW%" -p android bundleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   BUILD CONCLUIDO COM SUCESSO!
    echo ========================================
    echo.
    echo AAB gerado em:
    echo %~dp0android\app\build\outputs\bundle\release\app-release.aab
    echo.

    powershell -Command "$file = Get-Item '%~dp0android\app\build\outputs\bundle\release\app-release.aab'; $sizeMB = [math]::Round($file.Length / 1MB, 2); Write-Host 'Tamanho: '$sizeMB' MB' -ForegroundColor Green; Write-Host 'Data: '$file.LastWriteTime -ForegroundColor Green"

    echo.
    echo Pronto para upload no Google Play Console!
    echo.
) else (
    echo.
    echo ========================================
    echo   ERRO NO BUILD!
    echo ========================================
    echo.
)

pause
