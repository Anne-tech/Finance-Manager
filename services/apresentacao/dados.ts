import { getRelatorio, getSaldoAntesDe } from '../../database/operations';
import type { CategoriaSaida, DadosApresentacao, GerarDadosOpts, MesApresentacao } from './types';

const MESES_NOME = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const EPS = 0.02;

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export async function montarDadosApresentacao(opts: GerarDadosOpts): Promise<DadosApresentacao> {
  const relatorio = await getRelatorio(opts.dataInicio, opts.dataFim, opts.usuarioId);

  if (!relatorio.transacoes.length) {
    throw new Error('Não há transações registradas no período selecionado.');
  }

  const porMes = new Map<string, { entradas: { descricao: string; valor: number }[]; saidas: { descricao: string; valor: number }[] }>();
  relatorio.transacoes.forEach((t: any) => {
    const chave = t.data.slice(0, 7);
    if (!porMes.has(chave)) porMes.set(chave, { entradas: [], saidas: [] });
    const bucket = porMes.get(chave)!;
    const linha = { descricao: t.descricao || t.categoria?.nome || 'Sem descrição', valor: round2(t.valor) };
    if (t.tipo === 'ENTRADA') bucket.entradas.push(linha);
    else bucket.saidas.push(linha);
  });

  const chaves = Array.from(porMes.keys()).sort();

  const saldoInicial = round2(await getSaldoAntesDe(opts.dataInicio, opts.usuarioId));
  let saldoAnterior = saldoInicial;

  const meses: MesApresentacao[] = chaves.map((chave) => {
    const bucket = porMes.get(chave)!;
    // Transações vêm do banco em ordem decrescente de data; inverte para ordem cronológica dentro do mês.
    const entradas = [...bucket.entradas].reverse();
    const saidas = [...bucket.saidas].reverse();

    const arrecadado = round2(entradas.reduce((s, l) => s + l.valor, 0));
    const total_saidas = round2(saidas.reduce((s, l) => s + l.valor, 0));
    const total_entradas = round2(arrecadado + saldoAnterior);
    const saldo = round2(total_entradas - total_saidas);
    const resultado_mes = round2(arrecadado - total_saidas);

    const [ano, mesNumStr] = chave.split('-');
    const mesNum = parseInt(mesNumStr, 10);

    const mes: MesApresentacao = {
      chave,
      nome: MESES_NOME[mesNum - 1],
      ano,
      curto: `${MESES_ABREV[mesNum - 1]}/${ano.slice(2)}`,
      saldo_anterior: saldoAnterior,
      entradas,
      saidas,
      arrecadado,
      total_saidas,
      total_entradas,
      saldo,
      resultado_mes,
    };

    saldoAnterior = saldo;
    return mes;
  });

  const entradas_totais = round2(meses.reduce((s, m) => s + m.arrecadado, 0));
  const saidas_totais = round2(meses.reduce((s, m) => s + m.total_saidas, 0));
  const resultado_periodo = round2(entradas_totais - saidas_totais);
  const media_mensal = round2(entradas_totais / meses.length);
  const saldo_final = meses[meses.length - 1].saldo;

  validarMeses(meses);
  // Como o saldo inicial pode ser diferente de zero (período não cobre todo o histórico),
  // a invariante geral é saldo_final = saldo_inicial + resultado_periodo.
  if (Math.abs(saldo_final - (saldoInicial + resultado_periodo)) > EPS) {
    throw new Error('Falha de validação: o resultado do período não bate com o saldo do último mês.');
  }

  const composicao_saidas = montarComposicaoSaidas(relatorio.transacoes, saidas_totais);

  return {
    organizacao: opts.organizacao,
    subtitulo: opts.subtitulo || '',
    periodo_rotulo: opts.periodoRotulo,
    meses,
    entradas_totais,
    saidas_totais,
    resultado_periodo,
    media_mensal,
    saldo_inicial: saldoInicial,
    saldo_final,
    composicao_saidas,
  };
}

function validarMeses(meses: MesApresentacao[]) {
  meses.forEach((m, i) => {
    if (Math.abs(m.arrecadado + m.saldo_anterior - m.total_entradas) > EPS) {
      throw new Error(`Falha de validação em ${m.nome}/${m.ano}: entradas + saldo anterior não bate com o total de entradas.`);
    }
    const somaSaidas = round2(m.saidas.reduce((s, l) => s + l.valor, 0));
    if (Math.abs(somaSaidas - m.total_saidas) > EPS) {
      throw new Error(`Falha de validação em ${m.nome}/${m.ano}: soma das saídas não bate com o total de saídas.`);
    }
    if (Math.abs(m.total_entradas - m.total_saidas - m.saldo) > EPS) {
      throw new Error(`Falha de validação em ${m.nome}/${m.ano}: saldo não bate com entradas - saídas.`);
    }
    if (i > 0 && Math.abs(m.saldo_anterior - meses[i - 1].saldo) > EPS) {
      throw new Error(`Falha de validação: saldo transportado entre ${meses[i - 1].nome} e ${m.nome} não confere.`);
    }
  });
}

function montarComposicaoSaidas(transacoes: any[], saidasTotais: number): CategoriaSaida[] {
  const porCategoria = new Map<string, number>();
  transacoes.forEach((t) => {
    if (t.tipo !== 'SAIDA') return;
    const categoria = t.categoria?.nome || 'Outras despesas';
    porCategoria.set(categoria, round2((porCategoria.get(categoria) || 0) + t.valor));
  });

  const composicao = Array.from(porCategoria.entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  const soma = round2(composicao.reduce((s, c) => s + c.valor, 0));
  if (Math.abs(soma - saidasTotais) > EPS) {
    throw new Error('Falha de validação: soma das categorias de saída não bate com o total de saídas.');
  }

  return composicao;
}
