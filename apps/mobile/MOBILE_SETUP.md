# IcodLife Mobile — Guia de Setup e Testes

## Pré-requisitos

- Node.js 18+
- pnpm instalado globalmente
- Expo CLI: `npm install -g expo-cli`
- **Para Android**: Android Studio + emulador (AVD) configurado  
- **Para iOS** (somente macOS): Xcode + Simulator

---

## 1. Instalar dependências

```bash
cd apps/mobile
pnpm install
```

---

## 2. Configurar a URL da API

Edite `apps/mobile/.env`:

```env
# Emulador Android  → use 10.0.2.2 (mapeado para localhost do host)
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1

# Dispositivo físico → use o IP da sua máquina na rede Wi-Fi
# Ex: EXPO_PUBLIC_API_URL=http://192.168.1.100:3001/api/v1

# iOS Simulator    → localhost funciona normalmente
# EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## 3. Rodar com Expo Go (mais rápido — sem native build)

```bash
# Na raiz do monorepo:
pnpm --filter @icodlife/mobile dev

# Ou direto na pasta:
cd apps/mobile
npx expo start
```

Aparecerá um QR Code no terminal.  
- **Android**: Abra o app **Expo Go** → Scan QR Code  
- **iOS**: Abra a câmera do iPhone → aponte para o QR Code  

> ⚠️ Expo Go **não suporta** alguns módulos nativos (ex: `expo-local-authentication`).  
> Para esses casos use o build nativo (passo 4).

---

## 4. Build nativo (emulador / dispositivo real)

### Android (emulador)

```bash
# Abra o Android Studio → AVD Manager → inicie um emulador

cd apps/mobile
npx expo run:android
```

### Android (dispositivo físico)

```bash
# Ative "Opções do desenvolvedor" → "Depuração USB" no celular
# Conecte via USB

npx expo run:android --device
```

### iOS (somente macOS)

```bash
cd apps/mobile
npx expo run:ios
# ou para dispositivo físico:
npx expo run:ios --device
```

---

## 5. Build de produção com EAS (opcional)

```bash
npm install -g eas-cli
eas login
eas build --platform android   # APK/AAB
eas build --platform ios       # IPA
```

---

## 6. Estrutura de telas

| Tela             | Rota / Screen       | Status     |
|------------------|---------------------|------------|
| Login            | LoginScreen         | ✅ Pronto  |
| Cadastro         | RegisterScreen      | ✅ Pronto  |
| Dashboard        | DashboardScreen     | ✅ Pronto  |
| Exames           | RecordsScreen       | ✅ Pronto  |
| HealthBot (IA)   | HealthChatScreen    | ✅ Pronto  |
| Módulo Vida      | VidaScreen          | ✅ Pronto  |
| Perfil           | ProfileScreen       | ✅ Pronto  |
| Medicamentos     | MedicationsScreen   | ✅ Pronto  |
| Vacinas          | VaccinesScreen      | ✅ Pronto  |
| Família          | FamilyScreen        | ✅ Pronto  |
| Consultas        | AppointmentsScreen  | ✅ Pronto  |
| Ciclo Menstrual  | MenstrualScreen     | ✅ Pronto  |

---

## 7. Troubleshooting

**Metro bundler travado:**
```bash
npx expo start --clear
```

**Erro de build Android (Gradle):**
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

**App não conecta na API:**
- Verifique se o backend está rodando: `curl http://localhost:3001/health`
- Android emulador: use `10.0.2.2` (não `localhost`)
- Dispositivo físico: use o IP da máquina (ex: `192.168.1.x`)
- Certifique-se que firewall não bloqueia a porta 3001

**TypeScript errors:**
```bash
cd ../..  # raiz do monorepo
pnpm --filter @icodlife/api exec prisma generate
```
