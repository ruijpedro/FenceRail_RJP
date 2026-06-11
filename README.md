# Vedações

App IP/RJP para cadastro e inspeção de vedações ferroviárias.

## Alterações aplicadas
- Nome da app alterado para **Vedações**.
- `appId`/package Android atualizado para `com.rjp.vedacoes`.
- Ícone Android atualizado a partir do pacote `ic_launcher`.
- WebApp e APK alinhadas visualmente com a linha EDF_Oeste / EBTCC.
- Botões de sincronização, PDF/Drive/partilha e GPS mantidos.

## Build
```bash
npm install
npm run build
npx cap sync android
cd android
gradle assembleDebug
```
