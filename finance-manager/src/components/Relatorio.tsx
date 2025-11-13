'use client'

import { useState } from 'react'

interface RelatorioData {
  transacoes: any[]
  resumo: {
    totalEntradas: number
    totalSaidas: number
    saldoPeriodo: number
    quantidadeTransacoes: number
  }
  porCategoria: Record<string, {
    entradas: number
    saidas: number
    total: number
  }>
}

interface RelatorioProps {
  onClose: () => void
}

export default function Relatorio({ onClose }: RelatorioProps) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(false)

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      alert('Por favor, selecione as datas de início e fim')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        dataInicio,
        dataFim
      })

      const response = await fetch(`/api/relatorio?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRelatorio(data)
      } else {
        alert('Erro ao gerar relatório')
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      alert('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportarCSV = () => {
    if (!relatorio) return

    const csvContent = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'].join(','),
      ...relatorio.transacoes.map(t => [
        formatarData(t.data),
        t.descricao,
        t.categoria.nome,
        t.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
        t.valor.toString().replace('.', ',')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `relatorio_${dataInicio}_${dataFim}.csv`
    link.click()
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            Relatório por Período
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
              Data Início
            </label>
            <input
              type="date"
              id="dataInicio"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              id="dataFim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="w-full bg-slate-500 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
            >
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>

        {relatorio && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-semibold text-gray-900">
                Período: {formatarData(dataInicio)} a {formatarData(dataFim)}
              </h4>
              <button
                onClick={exportarCSV}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-md"
              >
                Exportar CSV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border">
                <h5 className="text-sm font-medium text-blue-700">Total Entradas</h5>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarValor(relatorio.resumo.totalEntradas)}
                </p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border">
                <h5 className="text-sm font-medium text-red-700">Total Saídas</h5>
                <p className="text-2xl font-bold text-red-600">
                  {formatarValor(relatorio.resumo.totalSaidas)}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                relatorio.resumo.saldoPeriodo >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <h5 className={`text-sm font-medium ${
                  relatorio.resumo.saldoPeriodo >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  Saldo do Período
                </h5>
                <p className={`text-2xl font-bold ${
                  relatorio.resumo.saldoPeriodo >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatarValor(relatorio.resumo.saldoPeriodo)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <h5 className="text-sm font-medium text-gray-700">Total Transações</h5>
                <p className="text-2xl font-bold text-gray-600">
                  {relatorio.resumo.quantidadeTransacoes}
                </p>
              </div>
            </div>

            <div>
              <h5 className="text-lg font-semibold text-gray-900 mb-4">
                Resumo por Categoria
              </h5>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entradas
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saídas
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(relatorio.porCategoria).map(([categoria, dados]) => (
                      <tr key={categoria} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {categoria}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">
                          {formatarValor(dados.entradas)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">
                          {formatarValor(dados.saidas)}
                        </td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${
                          dados.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatarValor(dados.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="text-lg font-semibold text-gray-900 mb-4">
                Transações do Período ({relatorio.transacoes.length})
              </h5>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {relatorio.transacoes.map((transacao) => (
                      <tr key={transacao.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatarData(transacao.data)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {transacao.descricao}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {transacao.categoria.nome}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transacao.tipo === 'ENTRADA'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transacao.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${
                          transacao.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transacao.tipo === 'ENTRADA' ? '+' : '-'}{formatarValor(transacao.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}