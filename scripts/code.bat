@echo off
setlocal

title VSCode Dev

pushd %~dp0\..

:: Get electron, compile, built-in extensions
:: Skipped — Electron already cached in .build\electron\
:: Uncomment below to re-enable if Electron needs re-downloading:
:: if "%VSCODE_SKIP_PRELAUNCH%"=="" (
:: 	node build/lib/preLaunch.ts
:: )

set "NAMESHORT="
for /f "tokens=2 delims=:," %%a in ('findstr /R /C:"\"nameShort\":.*" product.json') do if not defined NAMESHORT set "NAMESHORT=%%~a"
set NAMESHORT=%NAMESHORT: "=%
set NAMESHORT=%NAMESHORT:"=%.exe
set CODE=".build\electron\%NAMESHORT%"

:: Manage built-in extensions
if "%~1"=="--builtin" goto builtin

:: Configuration
set NODE_ENV=development
set VSCODE_DEV=1
set VSCODE_CLI=1
set ELECTRON_ENABLE_LOGGING=0
set ELECTRON_ENABLE_STACK_DUMPING=1
set LIBGL_ALWAYS_SOFTWARE=1
set GALLIUM_DRIVER=llvmpipe

set DISABLE_TEST_EXTENSION="--disable-extension=vscode.vscode-api-tests"
for %%A in (%*) do (
	if "%%~A"=="--extensionTestsPath" (
		set DISABLE_TEST_EXTENSION=""
	)
)

:: Kill any existing instance before launching
taskkill /IM AmypoCoder.exe /F 2>nul
timeout /t 1 /nobreak >nul

:: Launch Code
%CODE% --disable-gpu --in-process-gpu --disable-gpu-sandbox --disable-software-rasterizer --enable-unsafe-swiftshader --inspect-extensions=5871 . --new-window --skip-add-to-recently-opened %DISABLE_TEST_EXTENSION% %*
goto end

:builtin
%CODE% build/builtin

:end

popd

endlocal
