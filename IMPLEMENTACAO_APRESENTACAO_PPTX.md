# Implementação: Geração de Apresentação (.pptx) a partir dos dados do app

Resumo do que foi implementado para gerar a apresentação financeira (modelo em
`MODELO_APRESENTACAO_IEMP_VIX.md`) usando os dados reais do Finance Manager App, por
**ano completo** ou por **período personalizado** (data início/fim).

---

## Arquivos novos

### `services/apresentacao/types.ts`
Interfaces TypeScript do modelo de dados da apresentação: `MesApresentacao`,
`CategoriaSaida`, `DadosApresentacao`, `GerarDadosOpts`.

### `services/apresentacao/dados.ts`
Busca as transações do período (via `getRelatorio` em `database/operations.ts`), agrupa
por mês e calcula:

- `arrecadado`, `total_saidas`, `total_entradas`, `saldo`, `resultado_mes` (por mês)
- `entradas_totais`, `saidas_totais`, `resultado_periodo`, `media_mensal` (agregados)
- `composicao_saidas`: soma das saídas por categoria (usa as categorias já cadastradas
  no app, em vez do casamento de texto por descrição sugerido no modelo original)

Roda validações de consistência antes de gerar o arquivo (aborta com erro claro se algo
não bater):

1. `arrecadado + saldo_anterior == total_entradas` (por mês)
2. soma das saídas do mês == `total_saidas`
3. `total_entradas − total_saidas == saldo`
4. saldo transportado entre meses confere (`saldo_anterior[N] == saldo[N-1]`)
5. `saldo_final == saldo_inicial + resultado_periodo`
6. soma das categorias de saída == `saidas_totais`

**Decisão importante:** o saldo anterior do primeiro mês do período usa o saldo real
acumulado (via nova função `getSaldoAntesDe`), calculado a partir de todas as
transações anteriores à data de início — e não fixo em zero como no modelo original.
Isso porque, no modelo original, o período sempre cobria todo o histórico da igreja.
Aqui o período pode ser qualquer recorte (um ano específico, um intervalo qualquer),
então usar o saldo real transportado é o comportamento correto para um relatório
financeiro de verdade. Por causa disso, a validação 5 foi adaptada: em vez de exigir
`resultado_periodo == saldo do último mês` (só verdadeiro quando o saldo inicial é
zero), a validação verifica `saldo_final == saldo_inicial + resultado_periodo`.

### `services/apresentacao/gerar.ts`
Monta o `.pptx` com a biblioteca `pptxgenjs`, seguindo cores, tipografia e grade do
modelo:

- **Slide 1 — Capa**: fundo navy escuro, círculos decorativos, nome da organização,
  faixa com o período, saldo final.
- **Slide 2 — Panorama do período**: 4 cards (entradas totais, saídas totais,
  resultado do período, média mensal) + gráfico de colunas (entradas x saídas por mês).
- **Slide 3 — Evolução do saldo em caixa**: gráfico de linha com o saldo de cada mês.
- **Slides seguintes — um por mês**: 3 cards de resumo + duas colunas de lançamentos
  (entradas/saídas) com **altura de linha adaptativa** (a mesma lógica do modelo, para
  meses com muitos lançamentos caberem no cartão sem estourar).
- **Último slide — Composição das saídas**: gráfico de rosca por categoria + painel
  lateral "Estrutura de custos" com as 4 maiores categorias.

**Omitido de propósito:** o slide "Ofertas missionárias" do modelo original (tabela
anual de repasse a um missionário específico) não foi implementado — é uma peça
editorial de um caso pontual, não generalizável sem uma categoria/marcação dedicada no
app. Pode ser adicionado depois (por exemplo, deixando o usuário escolher uma categoria
para detalhar mês a mês em uma tabela anual).

### `services/apresentacao/index.ts`
Função `gerarECompartilharApresentacao(opts)` que:
1. monta os dados (`dados.ts`),
2. gera o `.pptx` em base64 (`gerar.ts`),
3. salva o arquivo com `expo-file-system` (`File.write(base64, { encoding: 'base64' })`),
4. compartilha com `expo-sharing`.

### `components/GerarApresentacaoModal.tsx`
Modal de UI (mesmo estilo visual dos outros modais do app) com:
- Nome da organização/igreja (pré-preenchido com o nome da conta ativa)
- Subtítulo da capa (opcional)
- Escolha de período: **Ano completo** (picker de ano) ou **Período personalizado**
  (dois seletores de data, iguais aos já usados na tela de Relatório)
- Botão "Gerar" com loading e tratamento de erro (mostra a mensagem de validação, se
  houver, em um `Alert`)

---

## Arquivos alterados

### `database/operations.ts`
Nova função `getSaldoAntesDe(data, usuarioId?)`: soma entradas menos saídas de todas as
transações anteriores a uma data — usada para calcular o saldo inicial do período.

### `app/relatorio.tsx`
Novo botão **"Apresentação (PPTX)"** ao lado do já existente "Relatório Mensal
(PDF/Word)", que abre o `GerarApresentacaoModal`.

### `package.json`
Nova dependência: `pptxgenjs@4.0.1`.

---

## Como funciona por baixo dos panos (RN/Expo)

`pptxgenjs` gera o `.pptx` inteiramente em JS puro (usa `jszip` para montar o zip e
monta os gráficos/planilhas embutidas como XML/zip aninhado — não depende de `fs`,
`https` nem de DOM/canvas do navegador). Por isso funciona tanto no app nativo
(iOS/Android) quanto na versão web, usando:

```ts
const base64 = await pres.write({ outputType: 'base64' });
```

em vez do `writeFile()` padrão da lib (que tenta usar `fs` no Node ou download no
navegador — nenhum dos dois existe em React Native). O base64 resultante é escrito em
disco com `expo-file-system` e compartilhado com `expo-sharing`, do mesmo jeito que o
CSV e o relatório mensal em PDF/Word já existentes no app.

---

## O que foi validado

- `npx tsc --noEmit`: nenhum erro novo introduzido pelos arquivos criados/alterados
  (os erros pré-existentes no projeto continuam os mesmos, sem relação com esta
  mudança).
- `npx expo export --platform web` e `--platform android`: o bundler resolve e compila
  o `pptxgenjs`/`jszip` sem problemas em ambos os alvos.
- Teste funcional isolado do gerador (`gerarPptxApresentacao` com dados fictícios):
  produz um `.pptx` válido — zip com `ppt/slides/slideN.xml`, `ppt/charts/chartN.xml` e
  planilhas Excel embutidas (`ppt/embeddings/Microsoft_Excel_WorksheetN.xlsx`) para
  cada gráfico.

## O que falta testar

- **Fluxo completo na UI**, em um emulador/dispositivo real ou `expo start --web`:
  abrir `Relatórios → Apresentação (PPTX)`, gerar para um ano com dados reais e um
  período personalizado, conferir o arquivo compartilhado/baixado e abri-lo no
  PowerPoint/Google Slides para checar o visual (posições, cores, gráficos,
  altura adaptativa das colunas de lançamentos com muitos itens).
- Meses sem nenhuma transação dentro do período (o slide deve renderizar normalmente,
  só com a linha de total, mas isso não foi verificado com um caso real do app).
