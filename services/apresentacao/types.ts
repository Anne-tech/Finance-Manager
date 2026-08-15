export interface LinhaValor {
  descricao: string;
  valor: number;
  muted?: boolean;
}

export interface MesApresentacao {
  chave: string; // "YYYY-MM"
  nome: string; // "Setembro"
  ano: string; // "2025"
  curto: string; // "Set/25"
  saldo_anterior: number;
  entradas: LinhaValor[];
  saidas: LinhaValor[];
  arrecadado: number;
  total_saidas: number;
  total_entradas: number;
  saldo: number;
  resultado_mes: number;
}

export interface CategoriaSaida {
  categoria: string;
  valor: number;
}

export interface DadosApresentacao {
  organizacao: string;
  subtitulo: string;
  periodo_rotulo: string;
  meses: MesApresentacao[];
  entradas_totais: number;
  saidas_totais: number;
  resultado_periodo: number;
  media_mensal: number;
  saldo_inicial: number;
  saldo_final: number;
  composicao_saidas: CategoriaSaida[];
}

export interface GerarDadosOpts {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  usuarioId?: string;
  organizacao: string;
  subtitulo?: string;
  periodoRotulo: string;
}
