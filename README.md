# FenceRail_RJP

App para levantamento, cadastro e inspeção de vedações em ambiente ferroviário.

## Funções incluídas

- Marcar início GPS
- Marcar fim GPS
- Estado de conservação
- Tipo de vedação
- Observações
- Ação corretiva / manutenção sem número
- Exportação Excel
- Exportação PDF
- Funcionamento base offline via localStorage

## Desenvolvimento

```bash
npm install
npm run dev
```

## Gerar Android

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

O APK fica normalmente em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```
