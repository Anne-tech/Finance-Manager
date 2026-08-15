import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const DB_NAME = 'finance_manager.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const deleteDatabaseAsync = async () => {
  try {
    dbInstance = null;
    const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
    }
  } catch (error) {
    // Ignorar erro silenciosamente
  }
};

const criarTabelas = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categorias (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SAIDA')),
      usuario_id TEXT,
      descricao TEXT,
      cor TEXT,
      icone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(nome, tipo, usuario_id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SAIDA')),
      data TEXT NOT NULL,
      categoria_id TEXT NOT NULL,
      usuario_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );
  `);
};

const migrarParaUsuarios = async (db: SQLite.SQLiteDatabase) => {
  // Verificar se categorias já tem usuario_id
  const colunasCategorias = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(categorias)'
  );
  const temUsuarioIdCategorias = colunasCategorias.some(c => c.name === 'usuario_id');

  if (!temUsuarioIdCategorias) {
    // Migração: criar usuário padrão e recriar tabela categorias com usuario_id
    const defaultUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.runAsync(
      'INSERT OR IGNORE INTO usuarios (id, nome) VALUES (?, ?)',
      [defaultUserId, 'Padrão']
    );

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categorias_v2 (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SAIDA')),
        usuario_id TEXT,
        descricao TEXT,
        cor TEXT,
        icone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(nome, tipo, usuario_id)
      );
    `);

    await db.runAsync(
      `INSERT OR IGNORE INTO categorias_v2 (id, nome, tipo, usuario_id, descricao, cor, icone, created_at, updated_at)
       SELECT id, nome, tipo, ?, descricao, cor, icone, created_at, updated_at FROM categorias`,
      [defaultUserId]
    );

    await db.execAsync('DROP TABLE categorias;');
    await db.execAsync('ALTER TABLE categorias_v2 RENAME TO categorias;');

    try {
      await db.execAsync('ALTER TABLE transacoes ADD COLUMN usuario_id TEXT;');
    } catch (e) {
      // Coluna já existe
    }

    await db.runAsync(
      'UPDATE transacoes SET usuario_id = ? WHERE usuario_id IS NULL',
      [defaultUserId]
    );
    return;
  }

  // Garantir que transacoes também tem usuario_id
  const colunasTransacoes = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(transacoes)'
  );
  const temUsuarioIdTransacoes = colunasTransacoes.some(c => c.name === 'usuario_id');
  if (!temUsuarioIdTransacoes) {
    try {
      await db.execAsync('ALTER TABLE transacoes ADD COLUMN usuario_id TEXT;');
    } catch (e) {
      // Coluna já existe
    }
  }
};

export const seedCategoriasParaUsuario = async (
  db: SQLite.SQLiteDatabase,
  usuarioId: string
) => {
  const categoriasEntrada = [
    'DÍZIMOS',
    'OFERTA ESPECIAL',
    'OFERTA MISSIONÁRIA',
    'OFERTA',
    'RESGATE APLICAÇÃO',
    'OFERTA ACAMPAMENTO',
  ];

  const categoriasSaida = [
    'ÁGUA',
    'TELEFONE',
    'ALUGUÉIS',
    'IPTU',
    'ZELADORIA MESES 09/12',
    'SALÁRIOS (incluído 1/3 de férias)',
    'INSS',
    'PLANO SAÚDE',
    'COMBUSTÍVEL',
    'PASSAGEM (3/12)',
    'PAPELARIA',
    'DESPESA DE MATERIAIS',
    'CAPA GUITARRA',
    'DESP. ACAMPAMENTO',
    'DESPESA IGREJA',
    'CORREIO PERU',
    'TAXA BANCÁRIA',
    'ASSISTÊNCIA SOCIAL',
    'OUTROS',
  ];

  for (const nome of categoriasEntrada) {
    const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO categorias (id, nome, tipo, usuario_id) VALUES (?, ?, ?, ?)`,
      [id, nome, 'ENTRADA', usuarioId]
    );
  }

  for (const nome of categoriasSaida) {
    const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO categorias (id, nome, tipo, usuario_id) VALUES (?, ?, ?, ?)`,
      [id, nome, 'SAIDA', usuarioId]
    );
  }
};

export const initDatabase = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    if (!db) {
      throw new Error('Banco de dados retornou null - falha ao abrir');
    }
    dbInstance = db;

    await criarTabelas(db);
    await migrarParaUsuarios(db);

    return db;
  } catch (error: any) {
    if (
      error?.message?.includes('NullPointerException') ||
      error?.message?.includes('corrupted') ||
      error?.message?.includes('malformed') ||
      error?.message?.includes('no column') ||
      error?.message?.includes('has no column') ||
      error?.message?.includes('null')
    ) {
      await deleteDatabaseAsync();
      await new Promise(resolve => setTimeout(resolve, 500));

      const db = await SQLite.openDatabaseAsync(DB_NAME);
      if (!db) {
        throw new Error('Falha crítica: não foi possível criar o banco de dados');
      }
      dbInstance = db;
      await criarTabelas(db);
      return db;
    }
    throw error;
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    if (!db) {
      throw new Error('Banco de dados retornou null');
    }
    dbInstance = db;
    return db;
  } catch (error) {
    const db = await initDatabase();
    if (!db) {
      throw new Error('Falha crítica ao abrir banco de dados');
    }
    return db;
  }
};
