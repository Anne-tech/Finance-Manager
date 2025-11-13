import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Data de início e fim são obrigatórias' },
        { status: 400 }
      )
    }

    const transacoes = await prisma.transacao.findMany({
      where: {
        data: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim),
        },
      },
      include: {
        categoria: true,
      },
      orderBy: {
        data: 'desc',
      },
    })

    const resumo = {
      totalEntradas: 0,
      totalSaidas: 0,
      saldoPeriodo: 0,
      quantidadeTransacoes: transacoes.length,
    }

    transacoes.forEach((transacao) => {
      if (transacao.tipo === 'ENTRADA') {
        resumo.totalEntradas += transacao.valor
      } else {
        resumo.totalSaidas += transacao.valor
      }
    })

    resumo.saldoPeriodo = resumo.totalEntradas - resumo.totalSaidas

    const porCategoria = transacoes.reduce((acc, transacao) => {
      const categoria = transacao.categoria.nome
      if (!acc[categoria]) {
        acc[categoria] = { entradas: 0, saidas: 0, total: 0 }
      }

      if (transacao.tipo === 'ENTRADA') {
        acc[categoria].entradas += transacao.valor
      } else {
        acc[categoria].saidas += transacao.valor
      }

      acc[categoria].total = acc[categoria].entradas - acc[categoria].saidas

      return acc
    }, {} as Record<string, { entradas: number; saidas: number; total: number }>)

    return NextResponse.json({
      transacoes,
      resumo,
      porCategoria,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}