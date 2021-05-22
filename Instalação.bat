@echo off
if exist node_modules\ (
  echo Deletando os modulos antigos
  rmdir node_modules /s /q
  echo Instalando modulos atualizados
  npm install --silent
  echo.
  echo Instalacao executada com sucesso!
  pause
) else (
  echo Instalando modulos atualizados
  npm install
  echo.
  echo Instalacao executada com sucesso!
  pause
)
