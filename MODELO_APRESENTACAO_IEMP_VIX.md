# Modelo da apresentação financeira — IEMP Vix

Especificação para gerar automaticamente o arquivo `.pptx` a partir dos mesmos dados que já
alimentam o PDF mensal. Tudo aqui foi extraído do deck aprovado
(`IEMP_Vix_Relatorio_Financeiro_corrigido.pptx`, 14 slides).

- **Unidade de medida:** polegadas (in). Para python-pptx: `1 in = 914400 EMU`.
- **Tamanho do slide:** `13.333 × 7.5 in` (16:9 widescreen).
- **Origem:** canto superior esquerdo, `x` cresce para a direita, `y` para baixo.

---

## 1. Dados de entrada

Um único JSON alimenta o PDF e a apresentação. Nada no deck é digitado à mão: todo número
exibido é calculado a partir dos lançamentos.

```json
{
  "igreja": "IEMP Vix",
  "periodo_rotulo": "Setembro/2025 a Junho/2026",
  "ofertas_missionarias_ano": {
    "titulo": "Ofertas missionárias João · janeiro a agosto/2025",
    "linhas": [
      { "mes": "Janeiro",   "entrada": null,    "saida": null },
      { "mes": "Fevereiro", "entrada": 2000.00, "saida": 2000.00 }
    ]
  },
  "meses": [
    {
      "nome": "Setembro – Outubro",
      "ano": "2025",
      "curto": "Set-Out/25",
      "saldo_anterior": 0.00,
      "entradas": [
        { "descricao": "Dízimos", "valor": 2700.00 },
        { "descricao": "Oferta de gazofilácio", "valor": 222.95 }
      ],
      "saidas": [
        { "descricao": "Água (CESAN)", "valor": 156.30 },
        { "descricao": "Salário do pastor", "valor": 1518.00 },
        { "descricao": "Aluguel do pastor", "valor": 1200.00 }
      ],
      "destaque": "Frase de uma linha exibida no rodapé do slide (opcional).",
      "nota": "Texto das anotações do apresentador (opcional)."
    }
  ]
}
```

**Regras do campo `entradas`:** contém **apenas a arrecadação do mês**. O saldo transportado
nunca é lançado como item — vem de `saldo_anterior` e é renderizado como linha própria.

---

## 2. Campos calculados

Calcule sempre; nunca leia do arquivo de origem.

| Campo | Fórmula |
|---|---|
| `arrecadado` | `soma(entradas[].valor)` |
| `total_saidas` | `soma(saidas[].valor)` |
| `total_entradas` | `arrecadado + saldo_anterior` |
| `saldo` | `total_entradas − total_saidas` |
| `resultado_mes` | `arrecadado − total_saidas` |
| `saldo_anterior` (mês N) | `saldo` do mês N−1 (o primeiro mês usa `0`) |

Agregados do período:

| Campo | Fórmula |
|---|---|
| `entradas_totais` | `soma(arrecadado)` de todos os meses |
| `saidas_totais` | `soma(total_saidas)` de todos os meses |
| `resultado_periodo` | `entradas_totais − saidas_totais` |
| `media_mensal` | `entradas_totais ÷ nº de meses` |

`resultado_periodo` **tem** que ser igual ao `saldo` do último mês. Se não for, a cadeia está
quebrada — pare e acuse o erro em vez de gerar o arquivo.

### Validações obrigatórias antes de gerar

Foram exatamente essas checagens que pegaram os erros da versão anterior. Rode todas; qualquer
falha aborta a geração:

1. `arrecadado + saldo_anterior == total_entradas` (por mês)
2. `soma(saidas) == total_saidas` (por mês)
3. `total_entradas − total_saidas == saldo` (por mês)
4. `saldo_anterior[N] == saldo[N−1]` (transporte entre meses)
5. `resultado_periodo == saldo[último mês]`
6. `soma(composicao_saidas) == saidas_totais` (slide 14)

Use aritmética decimal ou arredonde para 2 casas a cada operação. Ponto flutuante binário
acumula erro de centavos em somas longas.

---

## 3. Formatação de números

Padrão brasileiro, sempre com 2 casas e prefixo `R$ ` (com espaço):

```js
const brl = n => "R$ " + n.toLocaleString("pt-BR",
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });   // R$ 43.779,64
```

```python
def brl(v):
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
```

- Valor ausente em tabela: travessão `—` (U+2014), na cor cinza.
- Resultado do mês: prefixo `+` ou `−` (sinal de menos U+2212, não hífen).
- Percentuais: uma casa decimal com vírgula (`69,1%`).

---

## 4. Tokens de design

### Cores

| Token | Hex | Uso |
|---|---|---|
| `NAVY_DARK` | `111C3F` | fundo da capa |
| `NAVY` | `1E2761` | títulos, cartão de saldo, série do gráfico de linha |
| `ICE` | `CADCFC` | texto secundário sobre fundo escuro |
| `GREEN` | `20654A` | entradas |
| `GREEN_BG` | `E9F2ED` | fundo do cartão de entradas |
| `RED` | `9E3232` | saídas |
| `RED_BG` | `F8EBEB` | fundo do cartão de saídas |
| `GOLD` | `C9A227` | kicker, marcadores, faixa da capa |
| `CARD` | `F4F6FB` | fundo de cartões neutros |
| `MUTED` | `6B7180` | texto de apoio, rodapé |
| `LINE` | `DFE4EF` | divisórias de tabela e grade de gráfico |

### Tipografia

| Papel | Fonte | Tamanho | Peso |
|---|---|---|---|
| Título de slide | Cambria | 34 pt | bold |
| Título da capa | Cambria | 48 pt | bold |
| Número grande (cartão) | Cambria | 25 pt | bold |
| Título de painel lateral | Cambria | 17 pt | bold |
| Kicker (linha acima do título) | Calibri | 11,5 pt | bold, `charSpacing: 2` |
| Rótulo de cartão | Calibri | 10,5 pt | bold, `charSpacing: 1.2` |
| Linha de tabela | Calibri | 12,5 pt | normal |
| Total de tabela | Calibri | 13 pt | bold |
| Sublegenda de cartão | Calibri | 9,5 pt | normal |
| Rodapé | Calibri | 10,5 pt | itálico |

Rótulos de cartão e kickers vão sempre em CAIXA ALTA.

### Grade

- Margem lateral: `0.60` (conteúdo vai de `x=0.60` a `x=12.73`)
- Kicker: `y=0.40`, altura `0.28`
- Título: `y=0.70`, altura `0.72`, largura `11.00`
- Rodapé: `y=6.94`, altura `0.35` — texto em `x=0.60 w=10.40`, número da página em `x=12.10 w=0.60` alinhado à direita
- Cantos arredondados: `rectRadius 0.06` a `0.10`

---

## 5. Componentes

### 5.1 Cartão de indicador (`statCard`)

Quatro formas empilhadas. `x, y, w, h` são do retângulo de fundo.

| Elemento | Posição | Estilo |
|---|---|---|
| Fundo | `x, y, w, h` | retângulo arredondado, sem contorno |
| Rótulo | `x+0.28, y+0.16, w−0.56, 0.26` | Calibri 10,5 bold, caixa alta |
| Valor | `x+0.28, y+0.44, w−0.56, 0.46` | Cambria 25 bold |
| Sublegenda | `x+0.28, y+0.90, w−0.56, 0.24` | Calibri 9,5 |

Três variantes: **entradas** (fundo `GREEN_BG`, texto `GREEN`), **saídas** (fundo `RED_BG`,
texto `RED`) e **destaque** (fundo `NAVY`, rótulo/sublegenda `ICE`, valor branco).

### 5.2 Coluna de lançamentos (`coluna`)

Cartão `CARD` com cabeçalho e linhas. Usado nos slides mensais com `w=5.90`, `h=3.88`.

| Elemento | Posição | Estilo |
|---|---|---|
| Fundo | `x, y, w, h` | `CARD`, `rectRadius 0.06` |
| Bolinha do cabeçalho | `x+0.35, y+0.31, 0.20, 0.20` | elipse na cor da seção |
| Título da seção | `x+0.63, y+0.22, w−1.00, 0.38` | Calibri 13 bold, cor da seção |
| Linhas | começam em `y+0.82` | ver altura adaptativa abaixo |
| Descrição | `x+0.35, w−2.50` | Calibri, à esquerda |
| Valor | `x+w−2.15, w=1.80` | Calibri, à direita |
| Divisória | `x+0.35`, largura `w−0.70` | `LINE`, 1 px, acima de cada linha exceto a primeira |
| Divisória do total | idem | cor da seção, 1,5 px |

**Altura adaptativa das linhas** (é isso que faz junho, com 8 saídas, caber no mesmo cartão):

```
disponivel = h − 0.82 − 0.18
n          = qtd_itens + 1              // +1 para a linha de total
alturaLinha = min(0.42, disponivel / n)
fonte       = alturaLinha < 0.34 ? 11.5 : 12.5
```

A linha "Saldo do mês anterior" entra **por último** nas entradas, em itálico e cor `MUTED`,
para distinguir do que foi arrecadado no mês.

---

## 6. Estrutura do deck

| # | Slide | Repete? |
|---|---|---|
| 1 | Capa | não |
| 2 | Panorama do período | não |
| 3 | Evolução do saldo em caixa | não |
| 4 | Ofertas missionárias (quadro anual) | não |
| 5–13 | Um slide por mês | sim, 1× por mês do período |
| 14 | Composição das saídas | não |

Com outro número de meses, o deck cresce ou encolhe apenas na faixa 5–13; a numeração de
páginas é sequencial e o slide 1 não exibe número.

---

## 7. Slide 1 — Capa

Fundo `NAVY_DARK`.

| Elemento | Posição | Estilo |
|---|---|---|
| Círculo decorativo | `9.60, −1.50, 6.20, 6.20` | `NAVY`, transparência 35% |
| Círculo decorativo | `11.20, 4.20, 3.40, 3.40` | `GOLD`, transparência 78% |
| Nome da denominação | `0.90, 1.50, 9.50, 0.30` | Calibri 12 bold, `ICE`, `charSpacing 2` |
| Nome da igreja | `0.90, 1.85, 9.50, 0.60` | Cambria 28, branco |
| Título | `0.90, 2.70, 9.50, 1.70` | Cambria 48 bold, branco, 2 linhas |
| Faixa do período | `0.90, 4.75, 4.30, 0.62` | retângulo `GOLD`, texto Calibri 14 bold `NAVY_DARK` centralizado |
| Linha de resumo | `0.90, 5.65, 9.50, 0.35` | Calibri 13, `ICE` |

Texto da linha de resumo: `Saldo em caixa ao final do período: {saldo_final} · {n} relatórios mensais consolidados`.

---

## 8. Slide 2 — Panorama do período

Kicker `VISÃO GERAL`, título `Panorama do período`.

Quatro cartões: `y=1.65`, `w=2.88`, `h=1.28`, `x = 0.60 + i × 3.13` (→ 0.60 / 3.73 / 6.86 / 9.99).

| # | Rótulo | Valor | Variante | Sublegenda |
|---|---|---|---|---|
| 1 | ENTRADAS TOTAIS | `entradas_totais` | entradas | `{n} meses, sem saldos anteriores` |
| 2 | SAÍDAS TOTAIS | `saidas_totais` | saídas | — |
| 3 | RESULTADO DO PERÍODO | `resultado_periodo` | destaque | — |
| 4 | MÉDIA MENSAL ARRECADADA | `media_mensal` | neutra (`CARD`, valor `NAVY`) | — |

**Gráfico de colunas** em `0.50, 3.15, 12.30, 3.60`:

- Duas séries: `Entradas do mês` (`arrecadado`) e `Saídas do mês` (`total_saidas`)
- Categorias: campo `curto` de cada mês
- Cores `[GREEN, RED]`, `barGapWidthPct: 45`
- Título interno: `Entradas x saídas de cada mês (sem saldo anterior)`, Cambria 14, `NAVY`
- Legenda no topo; rótulos de dados em `outEnd`, 8,5 pt, `MUTED`, formato `#,##0`
- Eixo Y de 0 a 10000, grade `LINE`; sem grade no eixo X

Rodapé: `Totais recalculados a partir dos lançamentos de cada relatório, sem os saldos transportados de meses anteriores.`

---

## 9. Slide 3 — Evolução do saldo em caixa

Sem kicker. Título `Evolução do saldo em caixa`.

**Gráfico de linha** em `0.50, 1.50, 12.06, 5.00`:

- Série única `Saldo em caixa` = `saldo` de cada mês; categorias = `curto`
- Cor `NAVY`, espessura 3, marcador circular tamanho 8
- Título interno `Saldo ao final de cada mês (R$)`, Cambria 14
- Rótulos acima dos pontos, 9,5 pt, `NAVY`, formato `#,##0`; sem legenda

---

## 10. Slide 4 — Ofertas missionárias

Título: `Ofertas missionárias João · janeiro a agosto/2025`.

**Tabela** dentro de um cartão `CARD` em `0.60, 1.60, 7.40, 4.90`:

| Coluna | x (absoluto) | largura | alinhamento |
|---|---|---|---|
| Mês | `0.95` | 2.40 | esquerda |
| Entradas | `3.70` | 1.60 | direita |
| Saídas | `5.50` | 1.60 | direita |

- Cabeçalho em `y=1.82`, altura `0.30`, Calibri 10,5 bold `MUTED`
- Linhas a partir de `y=2.22`, passo `0.44`: divisória `LINE` em `y`, textos em `y+0.04` com altura `0.38`
- Meses sem movimento: texto e travessões em `MUTED`; meses com movimento: mês em `NAVY`, entrada em `GREEN`, saída em `RED`
- Após a última linha: divisória `NAVY` 1,5 px e linha de total (Calibri 13 bold) em `y+0.06`, altura `0.40`

Dois cartões à direita, `x=8.40`, `w=4.30`, `h=1.40`, em `y=1.60` e `y=3.15`:
`ENTRADAS NO ANO` (variante entradas) e `REPASSADO AO IRMÃO JOÃO` (variante saídas), ambos com
sublegenda `jan a ago/2025`.

---

## 11. Slides 5–13 — Um por mês

Cabeçalho:

| Elemento | Posição | Estilo |
|---|---|---|
| Ano (kicker) | `0.60, 0.42, 6.00, 0.28` | Calibri 11,5 bold `GOLD`, `charSpacing 2.5` |
| Nome do mês | `0.60, 0.70, 8.50, 0.68` | Cambria 34 bold `NAVY` |
| Identificação | `8.20, 0.70, 4.50, 0.68` | Calibri 12 `MUTED`, à direita — `IEMP Vix · Resumo financeiro` |

Três cartões em `y=1.60`, `w=3.90`, `h=1.22`, `x = 0.60 / 4.70 / 8.80`:

| # | Rótulo | Valor | Variante | Sublegenda |
|---|---|---|---|---|
| 1 | TOTAL DE ENTRADAS | `total_entradas` | entradas | `arrecadado no mês: {arrecadado}`, ou `sem saldo anterior` quando `saldo_anterior = 0` |
| 2 | TOTAL DE SAÍDAS | `total_saidas` | saídas | `{qtd} lançamento(s) no mês` |
| 3 | SALDO EM CAIXA | `saldo` | destaque | `resultado do mês: {sinal}{|resultado_mes|}` |

Duas colunas de lançamentos em `y=2.98`, `w=5.90`, `h=3.88`:

- **Entradas** em `x=0.60` — cor `GREEN`, itens + linha `Saldo do mês anterior` (se houver) + total `Total de entradas`
- **Saídas** em `x=6.80` — cor `RED`, itens + total `Total de saídas`

Rodapé: campo `destaque` do mês (itálico, `MUTED`) e número da página.
Anotações do apresentador: campo `nota`.

---

## 12. Slide 14 — Composição das saídas

Kicker `COMPOSIÇÃO DAS SAÍDAS`, título `Para onde foi o dinheiro`.

**Gráfico de rosca** em `0.30, 1.50, 6.60, 5.00`, `holeSize 55`, legenda embaixo, percentuais em
branco e negrito sobre as fatias. Paleta na ordem das categorias:
`[1E2761, 3D4C8C, C9A227, 9E3232, 8A90A3, 5FA8A0]`.

As categorias são agregações das descrições de saída de todos os meses. Mapeamento sugerido
(ajuste os padrões conforme o plano de contas):

| Categoria | Casa com descrições contendo |
|---|---|
| Salários e 13º do pastor | `salário`, `13º` |
| Aluguel | `aluguel` |
| Oferta missionária João | `missionária joão` |
| Energia (EDP) | `edp` |
| Água (CESAN) | `cesan`, `água` |
| Outras despesas | tudo o que sobrar |

A soma das categorias tem que bater com `saidas_totais` (validação 6).

Painel `CARD` à direita em `7.20, 1.50, 5.60, 5.00`:

- Título `Estrutura de custos` em `7.50, 1.75, 5.00, 0.38` (Cambria 17 bold)
- Quatro itens a partir de `y=2.35`, passo `1.05`: bolinha `GOLD` `0.18×0.18` em `7.50, y+0.06`;
  título em `7.80, y, 4.70, 0.30` (Calibri 13 bold `NAVY`); descrição em `7.80, y+0.30, 4.70, 0.62`
  (Calibri 11 `MUTED`)

---

## 13. Implementação de referência

O deck original foi gerado com **pptxgenjs** (Node). Esqueleto:

```js
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";           // 13.333 × 7.5 in

const s = pres.addSlide();
s.background = { color: "FFFFFF" };

s.addShape(pres.ShapeType.roundRect, {
  x: 0.6, y: 1.6, w: 3.9, h: 1.22,
  fill: { color: "E9F2ED" }, rectRadius: 0.08, line: { type: "none" },
});
s.addText("TOTAL DE ENTRADAS", {
  x: 0.88, y: 1.76, w: 3.34, h: 0.26,
  fontFace: "Calibri", fontSize: 10.5, bold: true,
  color: "20654A", charSpacing: 1.2, margin: 0, valign: "middle",
});

await pres.writeFile({ fileName: "relatorio.pptx" });
```

Equivalências em **python-pptx**, se o app for Python:

| pptxgenjs | python-pptx |
|---|---|
| `x/y/w/h` em polegadas | `Inches(x)` |
| `addShape(roundRect)` | `shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, ...)` |
| `rectRadius` | `shape.adjustments[0]` (fração da menor dimensão) |
| `addText` | `shapes.add_textbox(...)` + `text_frame.paragraphs[0].runs` |
| `line: {type:"none"}` | `shape.line.fill.background()` |
| `addChart` | `shapes.add_chart(XL_CHART_TYPE..., CategoryChartData())` |
| `addNotes` | `slide.notes_slide.notes_text_frame.text` |
| transparência | exige editar o XML (`<a:alpha val="65000"/>`) |

Detalhes que costumam passar batido:

- `margin: 0` e `valign: "middle"` em todas as caixas de texto — sem isso o alinhamento
  vertical dos cartões desanda.
- Divisórias são retângulos de altura `0` com contorno, não bordas de tabela.
- O deck não usa tabelas nativas do PowerPoint: cada linha é composta de caixas de texto
  independentes. É o que permite a altura adaptativa da seção 5.2.
- Fundo branco explícito em todos os slides, exceto a capa.

---

## 14. Checklist antes de publicar

- [ ] As 6 validações da seção 2 passaram
- [ ] Nº de slides = `4 + qtd_meses + 1`
- [ ] Rodapés numerados de 2 até o último slide (capa sem número)
- [ ] Nenhum texto vazando do cartão no mês com mais lançamentos
- [ ] Gráficos com os mesmos números dos slides mensais
- [ ] Capa exibindo o saldo do último mês
- [ ] PDF e PPTX apresentando valores idênticos
