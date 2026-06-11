# Vedações · Hub Manutenção IP

App para cadastro, inspeção e levantamento GPS de vedações ferroviárias.

## Inclui

- Visual verde IP alinhado com EDF_Oeste / EBTCC / AMV
- Módulo Hub Manutenção IP
- Levantamento GPS com Marcar Início e Marcar Fim
- Cálculo automático do comprimento do troço
- Registos locais em `localStorage`
- Exportação PDF e Excel
- Preparada para Google Drive, Google Sheets e Google Calendar via Apps Script
- Estrutura Drive: `Hub_Manutencao_IP/Vedacoes/Fotos, PDFs, Relatorios, Mapas, Backup`

## Build

```bash
npm install
npm run build
npx cap sync android
```

## Google Bridge

O código base está em `google-apps-script/Code.gs`.
Depois de publicar como Web App, coloca o URL no localStorage da WebApp/APK:

```js
localStorage.setItem('vedacoes_script_url','URL_DA_TUA_WEBAPP')
```
