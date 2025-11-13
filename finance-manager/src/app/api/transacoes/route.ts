import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TipoTransacao } from '@prisma/client'

export async function GET() {
  try {
    const transacoes = await prisma.transacao.findMany({
      include: {
        categoria: true,
      },
      orderBy: {
        data: 'desc',
      },
    })

    return NextResponse.json(transacoes)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar transações' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { descricao, valor, tipo, data, categoriaId } = await request.json()

    if (!descricao || !valor || !tipo || !data || !categoriaId) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    const transacao = await prisma.transacao.create({
      data: {
        descricao,
        valor: parseFloat(valor),
        tipo: tipo as TipoTransacao,
        data: new Date(data),
        categoriaId,
      },
      include: {
        categoria: true,
      },
    })

    return NextResponse.json(transacao)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar transação' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await prisma.transacao.deleteMany({})

    return NextResponse.json({
      message: 'Todas as transações foram excluídas com sucesso'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao excluir transações' },
      { status: 500 }
    )
  }
}