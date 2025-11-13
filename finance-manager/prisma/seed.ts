import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categorias = [
    // ENTRADAS
    {
      nome: 'DÍZIMOS',
      descricao: 'Dízimos recebidos dos membros',
      cor: '#10B981',
      icone: '🙏'
    },
    {
      nome: 'OFERTA ESPECIAL',
      descricao: 'Ofertas especiais para projetos específicos',
      cor: '#3B82F6',
      icone: '💝'
    },
    {
      nome: 'OFERTA MISSIONÁRIA',
      descricao: 'Ofertas destinadas ao trabalho missionário',
      cor: '#F59E0B',
      icone: '🌍'
    },
    {
      nome: 'OFERTA',
      descricao: 'Ofertas regulares dos cultos',
      cor: '#EF4444',
      icone: '💰'
    },
    {
      nome: 'RESGATE APLICAÇÃO',
      descricao: 'Valores resgatados de aplicações financeiras',
      cor: '#8B5CF6',
      icone: '📈'
    },
    {
      nome: 'OFERTA ACAMPAMENTO',
      descricao: 'Ofertas específicas para acampamentos',
      cor: '#059669',
      icone: '⛺'
    },

    // SAÍDAS - UTILIDADES E SERVIÇOS
    {
      nome: 'ÁGUA (CESAN)',
      descricao: 'Conta de água da companhia de saneamento',
      cor: '#06B6D4',
      icone: '💧'
    },
    {
      nome: 'TELEFONE',
      descricao: 'Contas de telefone fixo e móvel',
      cor: '#8B5CF6',
      icone: '📞'
    },

    // SAÍDAS - OCUPAÇÃO E IMÓVEIS
    {
      nome: 'ALUGUÉIS',
      descricao: 'Pagamento de aluguéis de imóveis',
      cor: '#F59E0B',
      icone: '🏠'
    },
    {
      nome: 'IPTU',
      descricao: 'Imposto Predial e Territorial Urbano',
      cor: '#DC2626',
      icone: '🏢'
    },
    {
      nome: 'ZELADORIA MESES 09/12',
      descricao: 'Pagamento de zeladoria período específico',
      cor: '#6B7280',
      icone: '🧹'
    },

    // SAÍDAS - PESSOAL
    {
      nome: 'SALÁRIOS (incluído 1/3 de férias)',
      descricao: 'Pagamento de salários e benefícios',
      cor: '#10B981',
      icone: '👥'
    },
    {
      nome: 'INSS',
      descricao: 'Contribuição previdenciária',
      cor: '#7C3AED',
      icone: '📋'
    },
    {
      nome: 'PLANO SAÚDE',
      descricao: 'Plano de saúde dos funcionários',
      cor: '#EF4444',
      icone: '🏥'
    },

    // SAÍDAS - TRANSPORTE
    {
      nome: 'COMBUSTÍVEL',
      descricao: 'Gastos com combustível para veículos',
      cor: '#F97316',
      icone: '⛽'
    },
    {
      nome: 'PASSAGEM (3/12)',
      descricao: 'Passagens de transporte período específico',
      cor: '#3B82F6',
      icone: '🚌'
    },

    // SAÍDAS - MATERIAIS E SUPRIMENTOS
    {
      nome: 'PAPELARIA',
      descricao: 'Material de escritório e papelaria',
      cor: '#EC4899',
      icone: '📝'
    },
    {
      nome: 'DESPESA DE MATERIAIS',
      descricao: 'Materiais diversos para igreja',
      cor: '#6366F1',
      icone: '📦'
    },
    {
      nome: 'CAPA GUITARRA',
      descricao: 'Equipamentos e acessórios musicais',
      cor: '#8B5CF6',
      icone: '🎸'
    },

    // SAÍDAS - EVENTOS E ATIVIDADES
    {
      nome: 'DESP. ACAMPAMENTO',
      descricao: 'Despesas relacionadas a acampamentos',
      cor: '#059669',
      icone: '⛺'
    },
    {
      nome: 'DESPESA IGREJA',
      descricao: 'Despesas gerais da igreja',
      cor: '#7C2D12',
      icone: '⛪'
    },

    // SAÍDAS - SERVIÇOS E TAXAS
    {
      nome: 'CORREIO PERU',
      descricao: 'Serviços de correio e correspondência',
      cor: '#CA8A04',
      icone: '📮'
    },
    {
      nome: 'TAXA BANCÁRIA',
      descricao: 'Taxas e tarifas bancárias',
      cor: '#DC2626',
      icone: '🏦'
    },

    // ASSISTÊNCIA
    {
      nome: 'ASSISTÊNCIA SOCIAL',
      descricao: 'Ajuda social aos necessitados',
      cor: '#BE185D',
      icone: '❤️'
    },

    // OUTROS
    {
      nome: 'OUTROS',
      descricao: 'Outras receitas e despesas diversas',
      cor: '#6B7280',
      icone: '📋'
    }
  ]

  for (const categoria of categorias) {
    await prisma.categoria.upsert({
      where: { nome: categoria.nome },
      update: {},
      create: categoria,
    })
  }

  console.log('Categorias criadas com sucesso!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })