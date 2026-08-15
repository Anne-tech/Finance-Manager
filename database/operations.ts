import { getDatabase, initDatabase, seedCategoriasParaUsuario } from './init';

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

// ========================
// USUÁRIOS
// ========================

export const getUsuarios = async (): Promise<Usuario[]> => {
  const db = await getDatabase();
  return await db.getAllAsync<Usuario>('SELECT * FROM usuarios ORDER BY nome');
};

export const addUsuario = async (nome: string): Promise<Usuario> => {
  const db = await getDatabase();
  const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.runAsync('INSERT INTO usuarios (id, nome) VALUES (?, ?)', [id, nome.trim()]);
  await seedCategoriasParaUsuario(db, id);
  return { id, nome: nome.trim() };
};

export const deleteUsuario = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transacoes WHERE usuario_id = ?', [id]);
  await db.runAsync('DELETE FROM categorias WHERE usuario_id = ?', [id]);
  await db.runAsync('DELETE FROM ajustes_saldo WHERE usuario_id = ?', [id]);
  await db.runAsync('DELETE FROM usuarios WHERE id = ?', [id]);
};

// ========================
// CATEGORIAS
// ========================

export const getCategorias = async (
  tipo?: 'ENTRADA' | 'SAIDA',
  usuarioId?: string
): Promise<Categoria[]> => {
  try {
    const db = await getDatabase();
    let query = 'SELECT * FROM categorias WHERE 1=1';
    const params: any[] = [];
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }
    if (usuarioId) {
      query += ' AND usuario_id = ?';
      params.push(usuarioId);
    }
    query += ' ORDER BY nome';
    return await db.getAllAsync<Categoria>(query, params);
  } catch (error: any) {
    if (
      error?.message?.includes('no such table') ||
      error?.message?.includes('no column') ||
      error?.message?.includes('has no column')
    ) {
      await initDatabase();
      return getCategorias(tipo, usuarioId);
    }
    throw error;
  }
};

export const addCategoria = async (
  nome: string,
  tipo: 'ENTRADA' | 'SAIDA',
  usuarioId?: string
): Promise<string> => {
  const db = await getDatabase();
  const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.runAsync(
    `INSERT INTO categorias (id, nome, tipo, usuario_id) VALUES (?, ?, ?, ?)`,
    [id, nome.trim().toUpperCase(), tipo, usuarioId || null]
  );
  return id;
};

export const updateCategoria = async (id: string, nome: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE categorias SET nome = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [nome.trim().toUpperCase(), id]
  );
};

export const deleteCategoria = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM categorias WHERE id = ?', [id]);
};

// ========================
// AJUSTES DE SALDO (MÊS ANTERIOR)
// ========================

export const getAjusteSaldoAnterior = async (
  usuarioId: string,
  ano: number,
  mes: number
): Promise<number | null> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ valor: number }>(
    'SELECT valor FROM ajustes_saldo WHERE usuario_id = ? AND ano = ? AND mes = ?',
    [usuarioId, ano, mes]
  );
  return rows.length > 0 ? rows[0].valor : null;
};

export const setAjusteSaldoAnterior = async (
  usuarioId: string,
  ano: number,
  mes: number,
  valor: number
): Promise<void> => {
  const db = await getDatabase();
  const id = `adj_${usuarioId}_${ano}_${mes}`;
  await db.runAsync(
    `INSERT INTO ajustes_saldo (id, usuario_id, ano, mes, valor) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(usuario_id, ano, mes) DO UPDATE SET valor = excluded.valor, updated_at = CURRENT_TIMESTAMP`,
    [id, usuarioId, ano, mes, valor]
  );
};

export const removeAjusteSaldoAnterior = async (
  usuarioId: string,
  ano: number,
  mes: number
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM ajustes_saldo WHERE usuario_id = ? AND ano = ? AND mes = ?',
    [usuarioId, ano, mes]
  );
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

  const db = await getDatabase();
  const mesAnteriorStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  let query = `SELECT tipo, valor FROM transacoes WHERE data LIKE ?`;
  const params: any[] = [`${mesAnteriorStr}%`];
  if (usuarioId) {
    query += ' AND usuario_id = ?';
    params.push(usuarioId);
  }
  const rows = await db.getAllAsync<{ tipo: 'ENTRADA' | 'SAIDA'; valor: number }>(query, params);
  return rows.reduce((acc, r) => (r.tipo === 'ENTRADA' ? acc + r.valor : acc - r.valor), 0);
};

// ========================
// TRANSAÇÕES
// ========================

export const getTransacoes = async (usuarioId?: string): Promise<Transacao[]> => {
  try {
    const db = await getDatabase();
    let query = `
      SELECT
        t.id,
        t.descricao,
        t.valor,
        t.tipo,
        t.data,
        t.categoria_id,
        t.usuario_id,
        c.nome as categoria_nome
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
    `;
    const params: any[] = [];
    if (usuarioId) {
      query += ' WHERE t.usuario_id = ?';
      params.push(usuarioId);
    }
    query += ' ORDER BY t.data DESC, t.created_at DESC';

    const transacoes = await db.getAllAsync<any>(query, params);
    return transacoes.map(t => ({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo,
      data: t.data,
      categoria_id: t.categoria_id,
      usuario_id: t.usuario_id,
      categoria: { id: t.categoria_id, nome: t.categoria_nome },
    }));
  } catch (error: any) {
    if (
      error?.message?.includes('no such table') ||
      error?.message?.includes('no column') ||
      error?.message?.includes('has no column')
    ) {
      await initDatabase();
      return getTransacoes(usuarioId);
    }
    throw error;
  }
};

export const addTransacao = async (
  descricao: string,
  valor: number,
  tipo: 'ENTRADA' | 'SAIDA',
  data: string,
  categoriaId: string,
  usuarioId?: string
): Promise<void> => {
  const db = await getDatabase();
  const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.runAsync(
    `INSERT INTO transacoes (id, descricao, valor, tipo, data, categoria_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, descricao, valor, tipo, data, categoriaId, usuarioId || null]
  );
};

export const updateTransacao = async (
  id: string,
  descricao: string,
  valor: number,
  tipo: 'ENTRADA' | 'SAIDA',
  data: string,
  categoriaId: string
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE transacoes SET descricao = ?, valor = ?, tipo = ?, data = ?, categoria_id = ? WHERE id = ?`,
    [descricao, valor, tipo, data, categoriaId, id]
  );
};

export const deleteTransacao = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transacoes WHERE id = ?', [id]);
};

export const deleteAllTransacoes = async (usuarioId?: string): Promise<void> => {
  const db = await getDatabase();
  if (usuarioId) {
    await db.runAsync('DELETE FROM transacoes WHERE usuario_id = ?', [usuarioId]);
  } else {
    await db.runAsync('DELETE FROM transacoes');
  }
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
  const db = await getDatabase();
  const usuarios = await db.getAllAsync<Usuario>('SELECT id, nome FROM usuarios');
  const categorias = await db.getAllAsync<Categoria>(
    'SELECT id, nome, tipo, usuario_id, descricao, cor, icone FROM categorias'
  );
  const transacoes = await db.getAllAsync<Omit<Transacao, 'categoria'>>(
    'SELECT id, descricao, valor, tipo, data, categoria_id, usuario_id FROM transacoes'
  );
  const ajustesSaldo = await db.getAllAsync<AjusteSaldo>(
    'SELECT usuario_id, ano, mes, valor FROM ajustes_saldo'
  );

  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    usuarios,
    categorias,
    transacoes,
    ajustesSaldo,
  };
};

export const importarDados = async (
  dados: BackupData,
  opts?: { modo?: 'mesclar' | 'substituir' }
): Promise<ResultadoImportacao> => {
  const db = await getDatabase();
  const modo = opts?.modo || 'mesclar';

  if (modo === 'substituir') {
    await db.runAsync('DELETE FROM transacoes');
    await db.runAsync('DELETE FROM ajustes_saldo');
    await db.runAsync('DELETE FROM categorias');
    await db.runAsync('DELETE FROM usuarios');
  }

  const resultado: ResultadoImportacao = { usuarios: 0, categorias: 0, transacoes: 0, ajustes: 0 };

  for (const u of dados.usuarios || []) {
    const r = await db.runAsync('INSERT OR IGNORE INTO usuarios (id, nome) VALUES (?, ?)', [u.id, u.nome]);
    if (r.changes > 0) resultado.usuarios++;
  }

  for (const c of dados.categorias || []) {
    const r = await db.runAsync(
      `INSERT OR IGNORE INTO categorias (id, nome, tipo, usuario_id, descricao, cor, icone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.nome, c.tipo, c.usuario_id || null, c.descricao || null, c.cor || null, c.icone || null]
    );
    if (r.changes > 0) resultado.categorias++;
  }

  for (const t of dados.transacoes || []) {
    const r = await db.runAsync(
      `INSERT OR IGNORE INTO transacoes (id, descricao, valor, tipo, data, categoria_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.descricao, t.valor, t.tipo, t.data, t.categoria_id, t.usuario_id || null]
    );
    if (r.changes > 0) resultado.transacoes++;
  }

  for (const a of dados.ajustesSaldo || []) {
    const id = `adj_${a.usuario_id}_${a.ano}_${a.mes}`;
    const r = await db.runAsync(
      `INSERT INTO ajustes_saldo (id, usuario_id, ano, mes, valor) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(usuario_id, ano, mes) DO UPDATE SET valor = excluded.valor, updated_at = CURRENT_TIMESTAMP`,
      [id, a.usuario_id, a.ano, a.mes, a.valor]
    );
    if (r.changes > 0) resultado.ajustes++;
  }

  return resultado;
};

export const getSaldoAntesDe = async (
  data: string,
  usuarioId?: string
): Promise<number> => {
  const db = await getDatabase();
  let query = `SELECT tipo, valor FROM transacoes WHERE data < ?`;
  const params: any[] = [data];
  if (usuarioId) {
    query += ' AND usuario_id = ?';
    params.push(usuarioId);
  }
  const rows = await db.getAllAsync<{ tipo: 'ENTRADA' | 'SAIDA'; valor: number }>(query, params);
  return rows.reduce((acc, r) => (r.tipo === 'ENTRADA' ? acc + r.valor : acc - r.valor), 0);
};

export const getRelatorio = async (
  dataInicio: string,
  dataFim: string,
  usuarioId?: string
) => {
  try {
    const db = await getDatabase();
    let query = `
      SELECT
        t.id,
        t.descricao,
        t.valor,
        t.tipo,
        t.data,
        COALESCE(c.nome, 'Sem Categoria') as categoria_nome
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE t.data >= ? AND t.data <= ?
    `;
    const params: any[] = [dataInicio, dataFim];
    if (usuarioId) {
      query += ' AND t.usuario_id = ?';
      params.push(usuarioId);
    }
    query += ' ORDER BY t.data DESC';

    const transacoes = await db.getAllAsync<any>(query, params);

    if (!transacoes || transacoes.length === 0) {
      return {
        transacoes: [],
        resumo: { totalEntradas: 0, totalSaidas: 0, saldoPeriodo: 0, quantidadeTransacoes: 0 },
        porCategoria: {},
      };
    }

    const resumo = { totalEntradas: 0, totalSaidas: 0, saldoPeriodo: 0, quantidadeTransacoes: transacoes.length };
    const porCategoria: Record<string, { entradas: number; saidas: number; total: number }> = {};

    transacoes.forEach(t => {
      const cat = t.categoria_nome || 'Sem Categoria';
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

    return {
      transacoes: transacoes.map(t => ({
        id: t.id,
        descricao: t.descricao,
        valor: t.valor,
        tipo: t.tipo,
        data: t.data,
        categoria: { nome: t.categoria_nome || 'Sem Categoria' },
      })),
      resumo,
      porCategoria,
    };
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    if (
      error?.message?.includes('no such table') ||
      error?.message?.includes('no column') ||
      error?.message?.includes('has no column') ||
      error?.message?.includes('NullPointerException')
    ) {
      await initDatabase();
      return getRelatorio(dataInicio, dataFim, usuarioId);
    }
    throw error;
  }
};
