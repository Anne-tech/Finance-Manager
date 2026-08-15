# Finance Manager Mobile

Aplicativo mobile de controle financeiro desenvolvido com React Native e Expo.

## Funcionalidades

- Registro de entradas e saídas financeiras
- Categorização de transações
- Dashboard com resumo financeiro
- Relatórios por período
- Exportação de relatórios em CSV
- Armazenamento local com SQLite

## Requisitos

- Node.js 18 ou superior (recomendado: Node 20+)
- npm ou yarn
- Expo Go (para testar no celular)
- Android Studio (para build Android)

## Instalação

1. Instale as dependências:
```bash
npm install
```

## Executar o app

### Modo desenvolvimento

```bash
npm start
```

Isso abrirá o Expo Dev Tools no navegador. Você pode:

- Escanear o QR code com o app Expo Go (Android/iOS)
- Pressionar `a` para abrir no emulador Android
- Pressionar `i` para abrir no simulador iOS (apenas no macOS)

### Android (emulador)

```bash
npm run android
```

### iOS (simulador - apenas macOS)

```bash
npm run ios
```

## Build para Android (Play Store)

### 1. Criar uma conta no Expo

Se ainda não tem, crie uma conta em https://expo.dev

### 2. Fazer login no Expo CLI

```bash
npx expo login
```

### 3. Build do APK ou AAB

Para testar (gera APK):
```bash
npx eas build --platform android --profile preview
```

Para produção (gera AAB para Play Store):
```bash
npx eas build --platform android --profile production
```

Nota: Na primeira vez, o Expo vai perguntar se você quer criar um arquivo `eas.json`. Responda sim.

### 4. Configurar o build

Quando solicitado, o Expo vai perguntar sobre keystore. Você pode:
- Deixar o Expo gerenciar automaticamente (recomendado)
- Ou usar sua própria keystore

### 5. Download do arquivo

Após o build (leva alguns minutos), você receberá um link para baixar o arquivo APK ou AAB.

- **APK**: Pode ser instalado diretamente no celular
- **AAB**: Formato necessário para publicar na Play Store

## Publicar na Play Store

1. Acesse o [Google Play Console](https://play.google.com/console)
2. Crie um novo aplicativo
3. Preencha as informações obrigatórias:
   - Descrição do app
   - Screenshots (mínimo 2)
   - Ícone
   - Banner
4. Faça upload do arquivo AAB gerado pelo Expo
5. Submeta para revisão

### Requisitos para publicação

- Conta de desenvolvedor do Google Play (taxa única de $25)
- Política de privacidade
- Ícone do app (512x512px)
- Screenshots do app
- Descrição curta e longa
- Categoria do app
- Classificação de conteúdo

## Estrutura do Projeto

```
finance-manager-mobile/
├── app/                    # Telas do app (Expo Router)
│   ├── _layout.tsx        # Layout principal
│   ├── index.tsx          # Dashboard (tela principal)
│   └── relatorio.tsx      # Tela de relatórios
├── components/            # Componentes reutilizáveis
│   ├── FormEntradaModal.tsx
│   └── FormSaidaModal.tsx
├── database/              # Banco de dados SQLite
│   ├── init.ts           # Inicialização e seeds
│   └── operations.ts     # Operações CRUD
└── app.json              # Configurações do Expo

```

## Customização

### Alterar cores

Edite os arquivos em `app/` e `components/` para ajustar as cores do tema.

### Alterar categorias

As categorias estão definidas em:
- `database/init.ts` - Categorias iniciais
- `components/FormEntradaModal.tsx` - Categorias de entrada
- `components/FormSaidaModal.tsx` - Categorias de saída

### Alterar ícone e splash screen

1. Substitua os arquivos em `assets/`:
   - `icon.png` (1024x1024px)
   - `splash-icon.png` (1242x2436px)
   - `adaptive-icon.png` (1024x1024px)

2. Execute:
```bash
npx expo prebuild --clean
```

## Tecnologias

- React Native 0.81
- Expo 54
- TypeScript
- Expo Router (navegação)
- Expo SQLite (banco de dados local)
- React Native DateTimePicker
- Expo File System (exportação CSV)

## Licença

MIT

## Suporte

Para problemas ou dúvidas, abra uma issue no repositório do GitHub.
