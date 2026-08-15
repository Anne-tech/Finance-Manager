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
