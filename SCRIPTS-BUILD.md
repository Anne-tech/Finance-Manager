# Scripts de Build Automático

Este projeto inclui scripts para automatizar o processo de build do AAB para o Google Play Store.

## Scripts Disponíveis

### 1. `build-release.bat` (Recomendado)
Build completo com limpeza antes de gerar o AAB.

**O que faz:**
- ✅ Incrementa automaticamente o `versionCode` (4 → 5)
- ✅ Incrementa automaticamente o `versionName` (1.0.3 → 1.0.4)
- ✅ Limpa o build anterior (`clean`)
- ✅ Gera o AAB de release assinado
- ✅ Mostra informações do arquivo gerado

**Quando usar:**
- Para builds de produção/publicação
- Quando quiser garantir um build limpo
- Primeira vez gerando após mudanças significativas

**Como usar:**
```
build-release.bat
```
Ou simplesmente clique duplo no arquivo.

---

### 2. `build-release-quick.bat` (Build Rápido)
Build rápido sem limpeza, apenas incrementa versão e gera o AAB.

**O que faz:**
- ✅ Incrementa automaticamente o `versionCode`
- ✅ Incrementa automaticamente o `versionName`
- ✅ Gera o AAB de release assinado (sem clean)
- ✅ Mostra informações do arquivo gerado

**Quando usar:**
- Para builds rápidos e testes
- Quando não houve mudanças estruturais grandes
- Para economizar tempo em builds subsequentes

**Como usar:**
```
build-release-quick.bat
```
Ou simplesmente clique duplo no arquivo.

---

## Saída do Build

Após a execução bem-sucedida, o AAB estará em:
```
android\app\build\outputs\bundle\release\app-release.aab
```

## Versionamento Automático

Os scripts incrementam automaticamente:
- **versionCode**: +1 a cada execução (ex: 4 → 5 → 6)
- **versionName**: incrementa o patch (ex: 1.0.3 → 1.0.4 → 1.0.5)

### Formato da Versão
```
versionName: MAJOR.MINOR.PATCH
            1    .0    .4
```

- **MAJOR**: Mudanças incompatíveis (incremente manualmente)
- **MINOR**: Novas funcionalidades (incremente manualmente)
- **PATCH**: Correções de bugs (incrementado automaticamente)

### Para Incrementar MAJOR ou MINOR Manualmente

Edite o arquivo `android/app/build.gradle`:
```gradle
versionCode 5
versionName "1.0.4"  // Altere para "1.1.0" ou "2.0.0" conforme necessário
```

Depois execute o script normalmente que ele continuará incrementando o PATCH.

---

## Solução de Problemas

### Erro: "Gradle não encontrado"
Certifique-se de que o projeto foi inicializado corretamente e que existe:
```
android\gradlew.bat
```

### Erro: "Keystore não encontrado"
Verifique se existe o arquivo:
```
android\key.properties
```

### Erro: "PowerShell bloqueado"
Execute como administrador ou ajuste as políticas do PowerShell:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## Fluxo de Trabalho Recomendado

1. **Faça suas alterações no código**
2. **Teste localmente** com Expo Go ou build de desenvolvimento
3. **Execute o script de build**:
   ```
   build-release.bat
   ```
4. **Aguarde a conclusão** (pode levar alguns minutos)
5. **Faça upload** do `app-release.aab` no Google Play Console

---

## Dicas

- 💡 Use `build-release.bat` para builds de produção
- 💡 Use `build-release-quick.bat` para testes rápidos
- 💡 Os scripts sempre incrementam a versão automaticamente
- 💡 O AAB já está assinado e pronto para publicação
- 💡 Não é necessário executar comandos manualmente

---

**Criado para Finance Manager App**
