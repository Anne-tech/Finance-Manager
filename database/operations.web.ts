import { seedCategoriasParaUsuario } from './init';

export interface Usuario {
  id: string;
  nome: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'ENTRADA' | 'SAIDA';
  usuario_id?: string;
  descricao?: string;
  cor?: string;
  icone?: string;
}

export interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
  data: string;
  categoria_id: string;
  usuario_id?: string;
  categoria?: Categoria;
}

const getDB = () => {
  const data = localStorage.getItem('finance_manager_db');
  return data ? JSON.parse(data) : { usuarios: [], categorias: [], transacoes: [] };
};

const saveDB = (db: any) => {
  localStorage.setItem('finance_manager_db', JSON.stringify(db));
};

// ========================
// USUÁRIOS
// ========================

export const getUsuarios = async (): Promise<Usuario[]> => {
  const db = getDB();
  return (db.usuarios || []).sort((a: Usuario, b: Usuario) => a.nome.localeCompare(b.nome));
};

export const addUsuario = async (nome: string): Promise<Usuario> => {
  const db = getDB();
  const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (!db.usuarios) db.usuarios = [];
  db.usuarios.push({ id, nome: nome.trim() });
  saveDB(db);
  await seedCategoriasParaUsuario(null, id);
  return { id, nome: nome.trim() };
};

export const deleteUsuario = async (id: string): Promise<void> => {
  const db = getDB();
  db.transacoes = (db.transacoes || []).filter((t: Transacao) => t.usuario_id !== id);
  db.categorias = (db.categorias || []).filter((c: Categoria) => c.usuario_id !== id);
  db.ajustesSaldo = (db.ajustesSaldo || []).filter((a: any) => a.usuario_id !== id);
  db.usuarios = (db.usuarios || []).filter((u: Usuario) => u.id !== id);
  saveDB(db);
};

// ========================
// CATEGORIAS
// ========================

export const getCategorias = async (
  tipo?: 'ENTRADA' | 'SAIDA',
  usuarioId?: string
): Promise<Categoria[]> => {
  const db = getDB();
  let categorias = db.categorias || [];
  if (tipo) categorias = categorias.filter((c: Categoria) => c.tipo === tipo);
  if (usuarioId) categorias = categorias.filter((c: Categoria) => c.usuario_id === usuarioId);
  return categorias.sort((a: Categoria, b: Categoria) => a.nome.localeCompare(b.nome));
};

export const addCategoria = async (
  nome: string,
  tipo: 'ENTRADA' | 'SAIDA',
  usuarioId?: string
): Promise<string> => {
  const db = getDB();
  const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.categorias.push({ id, nome: nome.trim().toUpperCase(), tipo, usuario_id: usuarioId || null });
  saveDB(db);
  return id;
};

export const updateCategoria = async (id: string, nome: string): Promise<void> => {
  const db = getDB();
  const index = db.categorias.findIndex((c: Categoria) => c.id === id);
  if (index !== -1) {
    db.categorias[index] = { ...db.categorias[index], nome: nome.trim().toUpperCase() };
    saveDB(db);
  }
};

export const deleteCategoria = async (id: string): Promise<void> => {
  const db = getDB();
  db.categorias = (db.categorias || []).filter((c: Categoria) => c.id !== id);
  saveDB(db);
};

// ========================
// AJUSTES DE SALDO (MÊS ANTERIOR)
// ========================

export const getAjusteSaldoAnterior = async (
  usuarioId: string,
  ano: number,
  mes: number
): Promise<number | null> => {
  const db = getDB();
  const ajustes = db.ajustesSaldo || [];
  const found = ajustes.find((a: any) => a.usuario_id === usuarioId && a.ano === ano && a.mes === mes);
  return found ? found.valor : null;
};

export const setAjusteSaldoAnterior = async (
  usuarioId: string,
  ano: number,
  mes: number,
  valor: number
): Promise<void> => {
  const db = getDB();
  if (!db.ajustesSaldo) db.ajustesSaldo = [];
  const index = db.ajustesSaldo.findIndex(
    (a: any) => a.usuario_id === usuarioId && a.ano === ano && a.mes === mes
  );
  if (index !== -1) {
    db.ajustesSaldo[index].valor = valor;
  } else {
    db.ajustesSaldo.push({ usuario_id: usuarioId, ano, mes, valor });
  }
  saveDB(db);
};

export const removeAjusteSaldoAnterior = async (
  usuarioId: string,
  ano: number,
  mes: number
): Promise<void> => {
  const db = getDB();
  db.ajustesSaldo = (db.ajustesSaldo || []).filter(
    (a: any) => !(a.usuario_id === usuarioId && a.ano === ano && a.mes === mes)
  );
  saveDB(db);
};

/**
 * Saldo do mês imediatamente anterior à data de referência (primeiro dia do
 * período de um relatório). Usa o ajuste manual salvo pelo usuário quando
 * existir; caso contrário, calcula automaticamente (entradas - saídas) das
 * transações daquele mês anterior.
 */
export const getSaldoMesAnterior = async (
  usuarioId: string | undefined,
  dataReferenciaISO: string
): Promise<number> => {
  const [anoStr, mesStr] = dataReferenciaISO.split('-');
  let mes = parseInt(mesStr, 10) - 1;
  let ano = parseInt(anoStr, 10);
  mes -= 1;
  if (mes < 0) {
    mes = 11;
    ano -= 1;
  }

  if (usuarioId) {
    const ajuste = await getAjusteSaldoAnterior(usuarioId, ano, mes);
    if (ajuste !== null) return ajuste;
  }

  const db = getDB();
  const mesAnteriorStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  let transacoes = (db.transacoes || []).filter((t: any) => t.data.startsWith(mesAnteriorStr));
  if (usuarioId) transacoes = transacoes.filter((t: any) => t.usuario_id === usuarioId);
  return transacoes.reduce(
    (acc: number, t: any) => (t.tipo === 'ENTRADA' ? acc + t.valor : acc - t.valor),
    0
  );
};

// ========================
// TRANSAÇÕES
// ========================

export const getTransacoes = async (usuarioId?: string): Promise<Transacao[]> => {
  const db = getDB();
  let transacoes = db.transacoes || [];
  if (usuarioId) transacoes = transacoes.filter((t: any) => t.usuario_id === usuarioId);

  return transacoes
    .map((t: any) => {
      const categoria = db.categorias.find((c: Categoria) => c.id === t.categoria_id);
      return { ...t, categoria: categoria || { id: t.categoria_id, nome: 'Sem Categoria' } };
    })
    .sort((a: Transacao, b: Transacao) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

export const addTransacao = async (
  descricao: string,
  valor: number,
  tipo: 'ENTRADA' | 'SAIDA',
  data: string,
  categoriaId: string,
  usuarioId?: string
): Promise<void> => {
  const db = getDB();
  const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.transacoes.push({ id, descricao, valor, tipo, data, categoria_id: categoriaId, usuario_id: usuarioId || null });
  saveDB(db);
};

export const updateTransacao = async (
  id: string,
  descricao: string,
  valor: number,
  tipo: 'ENTRADA' | 'SAIDA',
  data: string,
  categoriaId: string
): Promise<void> => {
  const db = getDB();
  const index = db.transacoes.findIndex((t: Transacao) => t.id === id);
  if (index !== -1) {
    db.transacoes[index] = { ...db.transacoes[index], descricao, valor, tipo, data, categoria_id: categoriaId };
    saveDB(db);
  }
};

export const deleteTransacao = async (id: string): Promise<void> => {
  const db = getDB();
  db.transacoes = db.transacoes.filter((t: Transacao) => t.id !== id);
  saveDB(db);
};

export const deleteAllTransacoes = async (usuarioId?: string): Promise<void> => {
  const db = getDB();
  if (usuarioId) {
    db.transacoes = db.transacoes.filter((t: any) => t.usuario_id !== usuarioId);
  } else {
    db.transacoes = [];
  }
  saveDB(db);
};

export const getSaldoAntesDe = async (
  data: string,
  usuarioId?: string
): Promise<number> => {
  const db = getDB();
  let transacoes = (db.transacoes || []).filter((t: any) => t.data < data);
  if (usuarioId) transacoes = transacoes.filter((t: any) => t.usuario_id === usuarioId);
  return transacoes.reduce(
    (acc: number, t: any) => (t.tipo === 'ENTRADA' ? acc + t.valor : acc - t.valor),
    0
  );
};

// ========================
// BACKUP (EXPORTAR / IMPORTAR)
// ========================

export interface AjusteSaldo {
  usuario_id: string;
  ano: number;
  mes: number;
  valor: number;
}

export interface BackupData {
  versao: number;
  exportadoEm: string;
  usuarios: Usuario[];
  categorias: Categoria[];
  transacoes: Omit<Transacao, 'categoria'>[];
  ajustesSaldo: AjusteSaldo[];
}

export interface ResultadoImportacao {
  usuarios: number;
  categorias: number;
  transacoes: number;
  ajustes: number;
}

export const exportarDados = async (): Promise<BackupData> => {
  const db = getDB();
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    usuarios: db.usuarios || [],
    categorias: db.categorias || [],
    transacoes: (db.transacoes || []).map((t: any) => ({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo,
      data: t.data,
      categoria_id: t.categoria_id,
      usuario_id: t.usuario_id,
    })),
    ajustesSaldo: db.ajustesSaldo || [],
  };
};

export const importarDados = async (
  dados: BackupData,
  opts?: { modo?: 'mesclar' | 'substituir' }
): Promise<ResultadoImportacao> => {
  const modo = opts?.modo || 'mesclar';
  const db = modo === 'substituir'
    ? { usuarios: [], categorias: [], transacoes: [], ajustesSaldo: [] }
    : getDB();
  if (!db.usuarios) db.usuarios = [];
  if (!db.categorias) db.categorias = [];
  if (!db.transacoes) db.transacoes = [];
  if (!db.ajustesSaldo) db.ajustesSaldo = [];

  const resultado: ResultadoImportacao = { usuarios: 0, categorias: 0, transacoes: 0, ajustes: 0 };

  (dados.usuarios || []).forEach((u) => {
    if (!db.usuarios.some((x: Usuario) => x.id === u.id)) {
      db.usuarios.push(u);
      resultado.usuarios++;
    }
  });

  (dados.categorias || []).forEach((c) => {
    if (!db.categorias.some((x: Categoria) => x.id === c.id)) {
      db.categorias.push(c);
      resultado.categorias++;
    }
  });

  (dados.transacoes || []).forEach((t) => {
    if (!db.transacoes.some((x: Transacao) => x.id === t.id)) {
      db.transacoes.push(t);
      resultado.transacoes++;
    }
  });

  (dados.ajustesSaldo || []).forEach((a) => {
    const index = db.ajustesSaldo.findIndex(
      (x: AjusteSaldo) => x.usuario_id === a.usuario_id && x.ano === a.ano && x.mes === a.mes
    );
    if (index !== -1) {
      db.ajustesSaldo[index].valor = a.valor;
    } else {
      db.ajustesSaldo.push(a);
      resultado.ajustes++;
    }
  });

  saveDB(db);
  return resultado;
};

export const getRelatorio = async (
  dataInicio: string,
  dataFim: string,
  usuarioId?: string
) => {
  const db = getDB();
  let transacoes = (db.transacoes || []).filter(
    (t: any) => t.data >= dataInicio && t.data <= dataFim
  );
  if (usuarioId) transacoes = transacoes.filter((t: any) => t.usuario_id === usuarioId);

  transacoes = transacoes
    .map((t: any) => {
      const categoria = db.categorias.find((c: Categoria) => c.id === t.categoria_id);
      return { ...t, categoria: { nome: categoria?.nome || 'Sem Categoria' } };
    })
    .sort((a: Transacao, b: Transacao) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (transacoes.length === 0) {
    return {
      transacoes: [],
      resumo: { totalEntradas: 0, totalSaidas: 0, saldoPeriodo: 0, quantidadeTransacoes: 0 },
      porCategoria: {},
    };
  }

  const resumo = { totalEntradas: 0, totalSaidas: 0, saldoPeriodo: 0, quantidadeTransacoes: transacoes.length };
  const porCategoria: Record<string, { entradas: number; saidas: number; total: number }> = {};

  transacoes.forEach((t: any) => {
    const cat = t.categoria.nome || 'Sem Categoria';
    if (t.tipo === 'ENTRADA') {
      resumo.totalEntradas += t.valor;
      resumo.saldoPeriodo += t.valor;
    } else {
      resumo.totalSaidas += t.valor;
      resumo.saldoPeriodo -= t.valor;
    }
    if (!porCategoria[cat]) porCategoria[cat] = { entradas: 0, saidas: 0, total: 0 };
    if (t.tipo === 'ENTRADA') {
      porCategoria[cat].entradas += t.valor;
      porCategoria[cat].total += t.valor;
    } else {
      porCategoria[cat].saidas += t.valor;
      porCategoria[cat].total -= t.valor;
    }
  });

  return { transacoes, resumo, porCategoria };
};
