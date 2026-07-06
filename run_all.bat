@echo off
echo Iniciando Base de Datos y Backend (API)...
start cmd /k "cd /d "%~dp0backend" && call "%~dp0.venv\Scripts\activate" && uvicorn main:app --host 0.0.0.0 --port 8080 --reload"

echo Iniciando App de React Native (Expo)...
start cmd /k "cd /d "%~dp0" && npm start"

echo Todo se ha iniciado correctamente! Puedes cerrar esta ventana negra.
exit