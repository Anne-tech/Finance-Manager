import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: {
        nome: 'asc',
      },
    })

    return NextResponse.json(categorias)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nome, descricao, cor, icone } = await request.json()

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    const categoria = await prisma.categoria.create({
      data: {
        nome,
        descricao,
        cor,
        icone,
      },
    })

    return NextResponse.json(categoria)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}