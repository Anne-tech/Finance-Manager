// Mock do banco de dados para web
export const deleteDatabaseAsync = async () => {
  localStorage.removeItem('finance_manager_db');
};

export const seedCategoriasParaUsuario = async (_db: any, usuarioId: string) => {
  const data = JSON.parse(localStorage.getItem('finance_manager_db') || '{}');
  if (!data.categorias) data.categorias = [];

  const categoriasEntrada = [
    'DÍZIMOS', 'OFERTA ESPECIAL', 'OFERTA MISSIONÁRIA', 'OFERTA',
    'RESGATE APLICAÇÃO', 'OFERTA ACAMPAMENTO',
  ];
  const categoriasSaida = [
    'ÁGUA', 'TELEFONE', 'ALUGUÉIS', 'IPTU', 'ZELADORIA MESES 09/12',
    'SALÁRIOS (incluído 1/3 de férias)', 'INSS', 'PLANO SAÚDE', 'COMBUSTÍVEL',
    'PASSAGEM (3/12)', 'PAPELARIA', 'DESPESA DE MATERIAIS', 'CAPA GUITARRA',
    'DESP. ACAMPAMENTO', 'DESPESA IGREJA', 'CORREIO PERU', 'TAXA BANCÁRIA',
    'ASSISTÊNCIA SOCIAL', 'OUTROS',
  ];

  const todos = [
    ...categoriasEntrada.map(n => ({ n, t: 'ENTRADA' })),
    ...categoriasSaida.map(n => ({ n, t: 'SAIDA' })),
  ];

  todos.forEach(({ n, t }) => {
    const existe = data.categorias.some(
      (c: any) => c.nome === n && c.tipo === t && c.usuario_id === usuarioId
    );
    if (!existe) {
      const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      data.categorias.push({ id, nome: n, tipo: t, usuario_id: usuarioId });
    }
  });

  localStorage.setItem('finance_manager_db', JSON.stringify(data));
};

export const initDatabase = async () => {
  const raw = localStorage.getItem('finance_manager_db');

  if (!raw) {
    const initialData = { usuarios: [], categorias: [], transacoes: [] };
    localStorage.setItem('finance_manager_db', JSON.stringify(initialData));
    return { web: true };
  }

  // Migração: adicionar suporte a usuários em dados existentes
  const data = JSON.parse(raw);
  let changed = false;

  if (!data.usuarios) {
    data.usuarios = [];
    changed = true;
  }

  // Se há categorias sem usuario_id, criar usuário padrão e migrar
  if (data.categorias?.length > 0 && data.categorias[0].usuario_id === undefined) {
    const defaultUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    data.usuarios.push({ id: defaultUserId, nome: 'Padrão' });
    data.categorias = data.categorias.map((c: any) => ({ ...c, usuario_id: defaultUserId }));
    data.transacoes = (data.transacoes || []).map((t: any) => ({ ...t, usuario_id: defaultUserId }));
    changed = true;
  }

  if (changed) {
    localStorage.setItem('finance_manager_db', JSON.stringify(data));
  }

  return { web: true };
};

export const getDatabase = async () => {
  return { web: true };
};
