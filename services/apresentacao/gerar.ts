import pptxgen from 'pptxgenjs';
import type { CategoriaSaida, DadosApresentacao, LinhaValor, MesApresentacao } from './types';

const COR = {
  NAVY_DARK: '111C3F',
  NAVY: '1E2761',
  ICE: 'CADCFC',
  GREEN: '20654A',
  GREEN_BG: 'E9F2ED',
  RED: '9E3232',
  RED_BG: 'F8EBEB',
  GOLD: 'C9A227',
  CARD: 'F4F6FB',
  MUTED: '6B7180',
  LINE: 'DFE4EF',
  TEXTO: '1F2937',
  WHITE: 'FFFFFF',
};

const DONUT_PALETA = ['1E2761', '3D4C8C', 'C9A227', '9E3232', '8A90A3', '5FA8A0'];

const FONT_TITULO = 'Cambria';
const FONT_TEXTO = 'Calibri';

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = (n: number) => n.toFixed(1).replace('.', ',');

// ---------------------------------------------------------------------------
// Elementos reutilizáveis
// ---------------------------------------------------------------------------

function addKicker(slide: pptxgen.Slide, texto: string) {
  slide.addText(texto.toUpperCase(), {
    x: 0.6, y: 0.4, w: 8.5, h: 0.28,
    fontFace: FONT_TEXTO, fontSize: 11.5, bold: true, color: COR.GOLD,
    charSpacing: 2, margin: 0, valign: 'middle',
  });
}

function addTitulo(slide: pptxgen.Slide, texto: string) {
  slide.addText(texto, {
    x: 0.6, y: 0.7, w: 11.0, h: 0.72,
    fontFace: FONT_TITULO, fontSize: 34, bold: true, color: COR.NAVY,
    margin: 0, valign: 'middle',
  });
}

function addRodape(slide: pptxgen.Slide, texto: string, pagina?: number) {
  slide.addText(texto, {
    x: 0.6, y: 6.94, w: 10.4, h: 0.35,
    fontFace: FONT_TEXTO, fontSize: 10.5, italic: true, color: COR.MUTED,
    margin: 0, valign: 'middle',
  });
  if (pagina != null) {
    slide.addText(String(pagina), {
      x: 12.10, y: 6.94, w: 0.6, h: 0.35,
      fontFace: FONT_TEXTO, fontSize: 10.5, color: COR.MUTED,
      align: 'right', margin: 0, valign: 'middle',
    });
  }
}

type Variante = 'entradas' | 'saidas' | 'destaque' | 'neutra';

const PALETA_CARD: Record<Variante, { bg: string; rotulo: string; valor: string; sub: string }> = {
  entradas: { bg: COR.GREEN_BG, rotulo: COR.GREEN, valor: COR.GREEN, sub: COR.GREEN },
  saidas: { bg: COR.RED_BG, rotulo: COR.RED, valor: COR.RED, sub: COR.RED },
  destaque: { bg: COR.NAVY, rotulo: COR.ICE, valor: COR.WHITE, sub: COR.ICE },
  neutra: { bg: COR.CARD, rotulo: COR.MUTED, valor: COR.NAVY, sub: COR.MUTED },
};

function addStatCard(slide: pptxgen.Slide, o: {
  x: number; y: number; w: number; h: number;
  rotulo: string; valor: string; variante: Variante; sublegenda?: string;
}) {
  const p = PALETA_CARD[o.variante];
  slide.addShape('roundRect', {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fill: { color: p.bg }, line: { type: 'none' }, rectRadius: 0.08,
  });
  slide.addText(o.rotulo.toUpperCase(), {
    x: o.x + 0.28, y: o.y + 0.16, w: o.w - 0.56, h: 0.26,
    fontFace: FONT_TEXTO, fontSize: 10.5, bold: true, color: p.rotulo,
    charSpacing: 1.2, margin: 0, valign: 'middle',
  });
  slide.addText(o.valor, {
    x: o.x + 0.28, y: o.y + 0.44, w: o.w - 0.56, h: 0.46,
    fontFace: FONT_TITULO, fontSize: 25, bold: true, color: p.valor,
    margin: 0, valign: 'middle',
  });
  if (o.sublegenda) {
    slide.addText(o.sublegenda, {
      x: o.x + 0.28, y: o.y + 0.90, w: o.w - 0.56, h: 0.24,
      fontFace: FONT_TEXTO, fontSize: 9.5, color: p.sub,
      margin: 0, valign: 'middle',
    });
  }
}

function addColuna(slide: pptxgen.Slide, o: {
  x: number; y: number; w: number; h: number;
  titulo: string; cor: string;
  itens: LinhaValor[];
  totalLabel: string; total: number;
}) {
  const { x, y, w, h, cor } = o;
  slide.addShape('roundRect', { x, y, w, h, fill: { color: COR.CARD }, line: { type: 'none' }, rectRadius: 0.06 });
  slide.addShape('ellipse', { x: x + 0.35, y: y + 0.31, w: 0.20, h: 0.20, fill: { color: cor }, line: { type: 'none' } });
  slide.addText(o.titulo, {
    x: x + 0.63, y: y + 0.22, w: w - 1.00, h: 0.38,
    fontFace: FONT_TEXTO, fontSize: 13, bold: true, color: cor, margin: 0, valign: 'middle',
  });

  // Colunas: categoria | descrição | valor
  const margem = 0.35;
  const gap = 0.08;
  const wValor = 1.55;
  const wCategoria = 1.30;
  const wDescricao = w - margem * 2 - wValor - wCategoria - gap * 2;
  const xCategoria = x + margem;
  const xDescricao = xCategoria + wCategoria + gap;
  const xValor = x + w - margem - wValor;

  slide.addText('CATEGORIA', {
    x: xCategoria, y: y + 0.63, w: wCategoria, h: 0.16,
    fontFace: FONT_TEXTO, fontSize: 8, bold: true, color: COR.MUTED, charSpacing: 0.5, margin: 0, valign: 'bottom',
  });
  slide.addText('DESCRIÇÃO', {
    x: xDescricao, y: y + 0.63, w: wDescricao, h: 0.16,
    fontFace: FONT_TEXTO, fontSize: 8, bold: true, color: COR.MUTED, charSpacing: 0.5, margin: 0, valign: 'bottom',
  });
  slide.addText('VALOR', {
    x: xValor, y: y + 0.63, w: wValor, h: 0.16,
    fontFace: FONT_TEXTO, fontSize: 8, bold: true, color: COR.MUTED, charSpacing: 0.5, align: 'right', margin: 0, valign: 'bottom',
  });

  const disponivel = h - 0.82 - 0.18;
  const n = o.itens.length + 1;
  const alturaLinha = Math.min(0.42, disponivel / n);
  const fonte = alturaLinha < 0.34 ? 9.5 : 10.5;

  let cursor = y + 0.82;
  o.itens.forEach((item, idx) => {
    if (idx > 0) {
      slide.addShape('line', { x: x + 0.35, y: cursor, w: w - 0.70, h: 0, line: { color: COR.LINE, width: 1 } });
    }
    const corTexto = item.muted ? COR.MUTED : COR.TEXTO;
    slide.addText(item.categoria, {
      x: xCategoria, y: cursor, w: wCategoria, h: alturaLinha,
      fontFace: FONT_TEXTO, fontSize: fonte, italic: !!item.muted, color: COR.MUTED,
      margin: 0, valign: 'middle', wrap: true,
    });
    slide.addText(item.descricao, {
      x: xDescricao, y: cursor, w: wDescricao, h: alturaLinha,
      fontFace: FONT_TEXTO, fontSize: fonte, italic: !!item.muted, color: corTexto,
      margin: 0, valign: 'middle', wrap: true,
    });
    slide.addText(brl(item.valor), {
      x: xValor, y: cursor, w: wValor, h: alturaLinha,
      fontFace: FONT_TEXTO, fontSize: fonte, italic: !!item.muted,
      color: item.muted ? COR.MUTED : cor, align: 'right', margin: 0, valign: 'middle',
    });
    cursor += alturaLinha;
  });

  slide.addShape('line', { x: x + 0.35, y: cursor, w: w - 0.70, h: 0, line: { color: cor, width: 1.5 } });
  cursor += 0.06;
  slide.addText(o.totalLabel, {
    x: xCategoria, y: cursor, w: (xValor - gap) - xCategoria, h: 0.40,
    fontFace: FONT_TEXTO, fontSize: 13, bold: true, color: cor, margin: 0, valign: 'middle',
  });
  slide.addText(brl(o.total), {
    x: xValor, y: cursor, w: wValor, h: 0.40,
    fontFace: FONT_TEXTO, fontSize: 13, bold: true, color: cor, align: 'right', margin: 0, valign: 'middle',
  });
}

// ---------------------------------------------------------------------------
// Gráficos
// ---------------------------------------------------------------------------

function addGraficoColunas(slide: pptxgen.Slide, meses: MesApresentacao[]) {
  const maiorValor = Math.max(1000, ...meses.map((m) => Math.max(m.arrecadado, m.total_saidas)));
  const tetoEixo = Math.ceil((maiorValor * 1.15) / 1000) * 1000;

  slide.addChart('bar', [
    { name: 'Entradas do mês', labels: meses.map((m) => m.curto), values: meses.map((m) => m.arrecadado) },
    { name: 'Saídas do mês', labels: meses.map((m) => m.curto), values: meses.map((m) => m.total_saidas) },
  ], {
    x: 0.50, y: 3.15, w: 12.30, h: 3.60,
    chartColors: [COR.GREEN, COR.RED],
    barGapWidthPct: 45,
    showTitle: true, title: 'Entradas x saídas de cada mês (sem saldo anterior)',
    titleFontFace: FONT_TITULO, titleFontSize: 14, titleColor: COR.NAVY,
    showLegend: true, legendPos: 't',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: COR.MUTED, dataLabelFontSize: 8.5, dataLabelFormatCode: '#,##0',
    valAxisMinVal: 0, valAxisMaxVal: tetoEixo, valGridLine: { color: COR.LINE },
    catAxisLineShow: false,
  });
}

function addGraficoLinha(slide: pptxgen.Slide, meses: MesApresentacao[]) {
  slide.addChart('line', [
    { name: 'Saldo em caixa', labels: meses.map((m) => m.curto), values: meses.map((m) => m.saldo) },
  ], {
    x: 0.50, y: 1.50, w: 12.06, h: 5.00,
    chartColors: [COR.NAVY],
    lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 8,
    showTitle: true, title: 'Saldo ao final de cada mês (R$)', titleFontFace: FONT_TITULO, titleFontSize: 14, titleColor: COR.NAVY,
    showValue: true, dataLabelPosition: 't', dataLabelColor: COR.NAVY, dataLabelFontSize: 9.5, dataLabelFormatCode: '#,##0',
    showLegend: false,
  });
}

function addGraficoRosca(slide: pptxgen.Slide, composicao: CategoriaSaida[]) {
  slide.addChart('doughnut', [
    { name: 'Composição das saídas', labels: composicao.map((c) => c.categoria), values: composicao.map((c) => c.valor) },
  ], {
    x: 0.30, y: 1.50, w: 6.60, h: 5.00,
    holeSize: 55,
    chartColors: DONUT_PALETA,
    showLegend: true, legendPos: 'b',
    showPercent: true, dataLabelColor: COR.WHITE, dataLabelFontBold: true,
  });
}

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

function addCapa(pres: pptxgen, dados: DadosApresentacao) {
  const slide = pres.addSlide();
  slide.background = { color: COR.NAVY_DARK };

  slide.addShape('ellipse', { x: 9.60, y: -1.50, w: 6.20, h: 6.20, fill: { color: COR.NAVY, transparency: 35 }, line: { type: 'none' } });
  slide.addShape('ellipse', { x: 11.20, y: 4.20, w: 3.40, h: 3.40, fill: { color: COR.GOLD, transparency: 78 }, line: { type: 'none' } });

  slide.addText((dados.subtitulo || 'CONTROLE FINANCEIRO').toUpperCase(), {
    x: 0.90, y: 1.50, w: 9.50, h: 0.30,
    fontFace: FONT_TEXTO, fontSize: 12, bold: true, color: COR.ICE, charSpacing: 2, margin: 0, valign: 'middle',
  });
  slide.addText(dados.organizacao, {
    x: 0.90, y: 1.85, w: 9.50, h: 0.60,
    fontFace: FONT_TITULO, fontSize: 28, color: COR.WHITE, margin: 0, valign: 'middle',
  });
  slide.addText('Relatório financeiro', {
    x: 0.90, y: 2.70, w: 9.50, h: 1.70,
    fontFace: FONT_TITULO, fontSize: 48, bold: true, color: COR.WHITE, margin: 0, valign: 'top',
  });

  slide.addShape('roundRect', { x: 0.90, y: 4.75, w: 4.30, h: 0.62, fill: { color: COR.GOLD }, line: { type: 'none' }, rectRadius: 0.10 });
  slide.addText(dados.periodo_rotulo, {
    x: 0.90, y: 4.75, w: 4.30, h: 0.62,
    fontFace: FONT_TEXTO, fontSize: 14, bold: true, color: COR.NAVY_DARK, align: 'center', margin: 0, valign: 'middle',
  });

  const nMeses = dados.meses.length;
  slide.addText(
    `Saldo em caixa ao final do período: ${brl(dados.saldo_final)} · ${nMeses} ${nMeses === 1 ? 'relatório mensal consolidado' : 'relatórios mensais consolidados'}`,
    {
      x: 0.90, y: 5.65, w: 9.50, h: 0.35,
      fontFace: FONT_TEXTO, fontSize: 13, color: COR.ICE, margin: 0, valign: 'middle',
    }
  );
}

function addPanorama(pres: pptxgen, dados: DadosApresentacao) {
  const slide = pres.addSlide();
  slide.background = { color: COR.WHITE };
  addKicker(slide, 'Visão geral');
  addTitulo(slide, 'Panorama do período');

  const nMeses = dados.meses.length;
  const cards: Array<{ rotulo: string; valor: string; variante: Variante; sublegenda?: string }> = [
    { rotulo: 'ENTRADAS TOTAIS', valor: brl(dados.entradas_totais), variante: 'entradas', sublegenda: `${nMeses} ${nMeses === 1 ? 'mês' : 'meses'}, sem saldos anteriores` },
    { rotulo: 'SAÍDAS TOTAIS', valor: brl(dados.saidas_totais), variante: 'saidas' },
    { rotulo: 'RESULTADO DO PERÍODO', valor: brl(dados.resultado_periodo), variante: 'destaque' },
    { rotulo: 'MÉDIA MENSAL ARRECADADA', valor: brl(dados.media_mensal), variante: 'neutra' },
  ];
  cards.forEach((c, i) => addStatCard(slide, { x: 0.60 + i * 3.13, y: 1.65, w: 2.88, h: 1.28, ...c }));

  addGraficoColunas(slide, dados.meses);
  addRodape(slide, 'Totais recalculados a partir dos lançamentos de cada relatório, sem os saldos transportados de meses anteriores.', 2);
}

function addEvolucaoSaldo(pres: pptxgen, dados: DadosApresentacao, pagina: number) {
  const slide = pres.addSlide();
  slide.background = { color: COR.WHITE };
  addTitulo(slide, 'Evolução do saldo em caixa');
  addGraficoLinha(slide, dados.meses);
  addRodape(slide, `${dados.organizacao} · saldo em caixa consolidado por mês`, pagina);
}

function addSlideMes(pres: pptxgen, dados: DadosApresentacao, mes: MesApresentacao, pagina: number) {
  const slide = pres.addSlide();
  slide.background = { color: COR.WHITE };

  slide.addText(mes.ano, {
    x: 0.6, y: 0.42, w: 6.00, h: 0.28,
    fontFace: FONT_TEXTO, fontSize: 11.5, bold: true, color: COR.GOLD, charSpacing: 2.5, margin: 0, valign: 'middle',
  });
  slide.addText(mes.nome, {
    x: 0.6, y: 0.70, w: 8.50, h: 0.68,
    fontFace: FONT_TITULO, fontSize: 34, bold: true, color: COR.NAVY, margin: 0, valign: 'middle',
  });
  slide.addText(`${dados.organizacao} · Resumo financeiro`, {
    x: 8.20, y: 0.70, w: 4.50, h: 0.68,
    fontFace: FONT_TEXTO, fontSize: 12, color: COR.MUTED, align: 'right', margin: 0, valign: 'middle',
  });

  addStatCard(slide, {
    x: 0.60, y: 1.60, w: 3.90, h: 1.22, rotulo: 'TOTAL DE ENTRADAS', valor: brl(mes.total_entradas), variante: 'entradas',
    sublegenda: mes.saldo_anterior === 0 ? 'sem saldo anterior' : `arrecadado no mês: ${brl(mes.arrecadado)}`,
  });
  addStatCard(slide, {
    x: 4.70, y: 1.60, w: 3.90, h: 1.22, rotulo: 'TOTAL DE SAÍDAS', valor: brl(mes.total_saidas), variante: 'saidas',
    sublegenda: `${mes.saidas.length} lançamento${mes.saidas.length === 1 ? '' : 's'} no mês`,
  });
  const sinal = mes.resultado_mes < 0 ? '−' : '+';
  addStatCard(slide, {
    x: 8.80, y: 1.60, w: 3.90, h: 1.22, rotulo: 'SALDO EM CAIXA', valor: brl(mes.saldo), variante: 'destaque',
    sublegenda: `resultado do mês: ${sinal}${brl(Math.abs(mes.resultado_mes))}`,
  });

  const itensEntradas: LinhaValor[] = [...mes.entradas];
  if (mes.saldo_anterior !== 0) {
    itensEntradas.push({ categoria: '—', descricao: 'Saldo do mês anterior', valor: mes.saldo_anterior, muted: true });
  }
  addColuna(slide, { x: 0.60, y: 2.98, w: 5.90, h: 3.88, titulo: 'ENTRADAS', cor: COR.GREEN, itens: itensEntradas, totalLabel: 'Total de entradas', total: mes.total_entradas });
  addColuna(slide, { x: 6.80, y: 2.98, w: 5.90, h: 3.88, titulo: 'SAÍDAS', cor: COR.RED, itens: mes.saidas, totalLabel: 'Total de saídas', total: mes.total_saidas });

  addRodape(slide, `${dados.organizacao} · ${mes.nome}/${mes.ano}`, pagina);
}

function addComposicaoSaidas(pres: pptxgen, dados: DadosApresentacao, pagina: number) {
  const slide = pres.addSlide();
  slide.background = { color: COR.WHITE };
  addKicker(slide, 'Composição das saídas');
  addTitulo(slide, 'Para onde foi o dinheiro');

  addGraficoRosca(slide, dados.composicao_saidas);

  slide.addShape('roundRect', { x: 7.20, y: 1.50, w: 5.60, h: 5.00, fill: { color: COR.CARD }, line: { type: 'none' }, rectRadius: 0.08 });
  slide.addText('Estrutura de custos', {
    x: 7.50, y: 1.75, w: 5.00, h: 0.38,
    fontFace: FONT_TITULO, fontSize: 17, bold: true, color: COR.NAVY, margin: 0, valign: 'middle',
  });

  dados.composicao_saidas.slice(0, 4).forEach((c, i) => {
    const y = 2.35 + i * 1.05;
    const percentual = dados.saidas_totais > 0 ? (c.valor / dados.saidas_totais) * 100 : 0;
    slide.addShape('ellipse', { x: 7.50, y: y + 0.06, w: 0.18, h: 0.18, fill: { color: COR.GOLD }, line: { type: 'none' } });
    slide.addText(c.categoria, {
      x: 7.80, y, w: 4.70, h: 0.30,
      fontFace: FONT_TEXTO, fontSize: 13, bold: true, color: COR.NAVY, margin: 0, valign: 'middle',
    });
    slide.addText(`${brl(c.valor)} · ${pct1(percentual)}% do total de saídas`, {
      x: 7.80, y: y + 0.30, w: 4.70, h: 0.62,
      fontFace: FONT_TEXTO, fontSize: 11, color: COR.MUTED, margin: 0, valign: 'top',
    });
  });

  addRodape(slide, `${dados.organizacao} · composição das saídas do período`, pagina);
}

// ---------------------------------------------------------------------------
// Montagem final
// ---------------------------------------------------------------------------

export async function gerarPptxApresentacao(dados: DadosApresentacao): Promise<string> {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Finance Manager';
  pres.company = dados.organizacao;
  pres.title = `${dados.organizacao} - ${dados.periodo_rotulo}`;

  addCapa(pres, dados);
  addPanorama(pres, dados);
  addEvolucaoSaldo(pres, dados, 3);

  let pagina = 4;
  dados.meses.forEach((mes) => {
    addSlideMes(pres, dados, mes, pagina);
    pagina += 1;
  });

  if (dados.composicao_saidas.length > 0) {
    addComposicaoSaidas(pres, dados, pagina);
  }

  const base64 = (await pres.write({ outputType: 'base64' })) as string;
  return base64;
}
