'use client'

import { useState, useEffect } from 'react'
import FormEntrada from './FormEntrada'
import FormSaida from './FormSaida'
import Relatorio from './Relatorio'

interface Categoria {
  id: string
  nome: string
  descricao?: string
  cor?: string
  icone?: string
}

interface Transacao {
  id: string
  descricao: string
  valor: number
  tipo: 'ENTRADA' | 'SAIDA'
  data: string
  categoria: Categoria
}

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [saldoTotal, setSaldoTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mostrarFormEntrada, setMostrarFormEntrada] = useState(false)
  const [mostrarFormSaida, setMostrarFormSaida] = useState(false)
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)

  useEffect(() => {
    carregarTransacoes()
  }, [])

  const carregarTransacoes = async () => {
    try {
      const response = await fetch('/api/transacoes')
      if (response.ok) {
        const data = await response.json()
        setTransacoes(data)

        const saldo = data.reduce((acc: number, transacao: Transacao) => {
          return transacao.tipo === 'ENTRADA'
            ? acc + transacao.valor
            : acc - transacao.valor
        }, 0)
        setSaldoTotal(saldo)
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const limparTodasTransacoes = async () => {
    if (window.confirm('Tem certeza que deseja excluir TODAS as transações? Esta ação não pode ser desfeita!')) {
      try {
        const response = await fetch('/api/transacoes', {
          method: 'DELETE'
        })

        if (response.ok) {
          await carregarTransacoes()
          alert('Todas as transações foram excluídas com sucesso!')
        } else {
          alert('Erro ao excluir transações')
        }
      } catch (error) {
        console.error('Erro ao excluir transações:', error)
        alert('Erro ao excluir transações')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Controle Financeiro
          </h1>
          <p className="text-gray-600">
            Acompanhe suas entradas e saídas
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setMostrarRelatorio(true)}
            className="bg-slate-500 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Relatórios
          </button>
          <button
            onClick={() => setMostrarFormEntrada(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Nova Entrada
          </button>
          <button
            onClick={() => setMostrarFormSaida(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Nova Saída
          </button>
          <button
            onClick={limparTodasTransacoes}
            className="bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Limpar Tudo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Saldo Total
          </h3>
          <p className={`text-3xl font-bold ${
            saldoTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatarValor(saldoTotal)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Total de Entradas
          </h3>
          <p className="text-3xl font-bold text-emerald-600">
            {formatarValor(
              transacoes
                .filter(t => t.tipo === 'ENTRADA')
                .reduce((acc, t) => acc + t.valor, 0)
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Total de Saídas
          </h3>
          <p className="text-3xl font-bold text-rose-600">
            {formatarValor(
              transacoes
                .filter(t => t.tipo === 'SAIDA')
                .reduce((acc, t) => acc + t.valor, 0)
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Transações Recentes
          </h2>
        </div>

        {transacoes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhuma transação encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transacoes.map((transacao) => (
                  <tr key={transacao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarData(transacao.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transacao.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transacao.categoria.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transacao.tipo === 'ENTRADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {transacao.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transacao.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {transacao.tipo === 'ENTRADA' ? '+' : '-'}{formatarValor(transacao.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarFormEntrada && (
        <FormEntrada
          onTransacaoAdicionada={carregarTransacoes}
          onClose={() => setMostrarFormEntrada(false)}
        />
      )}

      {mostrarFormSaida && (
        <FormSaida
          onTransacaoAdicionada={carregarTransacoes}
          onClose={() => setMostrarFormSaida(false)}
        />
      )}

      {mostrarRelatorio && (
        <Relatorio onClose={() => setMostrarRelatorio(false)} />
      )}
    </div>
  )
}