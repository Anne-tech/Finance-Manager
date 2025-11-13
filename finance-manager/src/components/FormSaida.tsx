'use client'

import { useState, useEffect } from 'react'

interface Categoria {
  id: string
  nome: string
  descricao?: string
  cor?: string
  icone?: string
}

interface FormSaidaProps {
  onTransacaoAdicionada: () => void
  onClose: () => void
}

export default function FormSaida({ onTransacaoAdicionada, onClose }: FormSaidaProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    categoriaId: ''
  })
  const [loading, setLoading] = useState(false)

  // Categorias específicas para SAÍDAS
  const categoriasSaida = [
    'ÁGUA (CESAN)',
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
    'OUTROS'
  ]

  useEffect(() => {
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    try {
      const response = await fetch('/api/categorias')
      if (response.ok) {
        const data = await response.json()
        // Filtrar apenas categorias de saída
        const categoriasFiltered = data.filter((cat: Categoria) =>
          categoriasSaida.includes(cat.nome)
        )
        setCategorias(categoriasFiltered)
        if (categoriasFiltered.length > 0) {
          setFormData(prev => ({ ...prev, categoriaId: categoriasFiltered[0].id }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/transacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tipo: 'SAIDA'
        }),
      })

      if (response.ok) {
        setFormData({
          descricao: '',
          valor: '',
          data: new Date().toISOString().split('T')[0],
          categoriaId: categorias.length > 0 ? categorias[0].id : ''
        })
        onTransacaoAdicionada()
        onClose()
      } else {
        alert('Erro ao adicionar saída')
      }
    } catch (error) {
      console.error('Erro ao adicionar saída:', error)
      alert('Erro ao adicionar saída')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-rose-800">
              Nova Saída
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-700">
                Data
              </label>
              <input
                type="date"
                name="data"
                id="data"
                required
                value={formData.data}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-400 focus:ring-rose-400 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label htmlFor="categoriaId" className="block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select
                name="categoriaId"
                id="categoriaId"
                required
                value={formData.categoriaId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-400 focus:ring-rose-400 sm:text-sm border p-2"
              >
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-rose-600 font-medium">R$</span>
                <input
                  type="number"
                  name="valor"
                  id="valor"
                  step="0.01"
                  min="0"
                  required
                  value={formData.valor}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="mt-1 block w-full pl-12 rounded-md border-gray-300 shadow-sm focus:border-rose-400 focus:ring-rose-400 sm:text-sm border p-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                Descrição <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                name="descricao"
                id="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Ex: Conta de água, Salário pastor..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-400 focus:ring-rose-400 sm:text-sm border p-2"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-rose-500 border border-transparent rounded-md hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-400 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Adicionar Saída'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}