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
