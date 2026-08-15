// Script para adicionar dados de demonstração
import { addTransacao, getCategorias } from './operations';

export const seedDemoData = async () => {
  try {
    // Obter categorias
    const categoriasEntrada = await getCategorias('ENTRADA');
    const categoriasSaida = await getCategorias('SAIDA');

    if (categoriasEntrada.length === 0 || categoriasSaida.length === 0) {
      console.log('Categorias não encontradas');
      return;
    }

    // Data atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Função auxiliar para formatar data (YYYY-MM-DD)
    const formatarData = (dia: number) => {
      const data = new Date(anoAtual, mesAtual, dia);
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const diaStr = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${diaStr}`;
    };

    // Adicionar transações de entrada de exemplo
    const dizimosId = categoriasEntrada.find(c => c.nome === 'DÍZIMOS')?.id;
    const ofertaId = categoriasEntrada.find(c => c.nome === 'OFERTA')?.id;
    const ofertaEspecialId = categoriasEntrada.find(c => c.nome === 'OFERTA ESPECIAL')?.id;

    if (dizimosId) {
      await addTransacao('Dízimos do mês', 2500.00, 'ENTRADA', formatarData(5), dizimosId);
      await addTransacao('Dízimos - Culto de domingo', 800.00, 'ENTRADA', formatarData(12), dizimosId);
      await addTransacao('Dízimos - Reunião de quarta', 450.00, 'ENTRADA', formatarData(15), dizimosId);
    }

    if (ofertaId) {
      await addTransacao('Oferta do culto', 350.00, 'ENTRADA', formatarData(7), ofertaId);
      await addTransacao('Oferta - Celebração', 520.00, 'ENTRADA', formatarData(14), ofertaId);
    }

    if (ofertaEspecialId) {
      await addTransacao('Oferta especial - Construção', 1200.00, 'ENTRADA', formatarData(10), ofertaEspecialId);
    }

    // Adicionar transações de saída de exemplo
    const aguaId = categoriasSaida.find(c => c.nome === 'ÁGUA')?.id;
    const telefoneId = categoriasSaida.find(c => c.nome === 'TELEFONE')?.id;
    const aluguelId = categoriasSaida.find(c => c.nome === 'ALUGUÉIS')?.id;
    const salariosId = categoriasSaida.find(c => c.nome === 'SALÁRIOS (incluído 1/3 de férias)')?.id;
    const combustivelId = categoriasSaida.find(c => c.nome === 'COMBUSTÍVEL')?.id;
    const pastelariaId = categoriasSaida.find(c => c.nome === 'PAPELARIA')?.id;

    if (aguaId) {
      await addTransacao('Conta de água - Templo', 185.50, 'SAIDA', formatarData(8), aguaId);
    }

    if (telefoneId) {
      await addTransacao('Telefone e internet', 220.00, 'SAIDA', formatarData(10), telefoneId);
    }

    if (aluguelId) {
      await addTransacao('Aluguel do salão', 1500.00, 'SAIDA', formatarData(5), aluguelId);
    }

    if (salariosId) {
      await addTransacao('Salário do pastor', 3200.00, 'SAIDA', formatarData(5), salariosId);
      await addTransacao('Salário do zelador', 1500.00, 'SAIDA', formatarData(5), salariosId);
    }

    if (combustivelId) {
      await addTransacao('Combustível - Visita missionária', 150.00, 'SAIDA', formatarData(12), combustivelId);
      await addTransacao('Combustível - Van da igreja', 280.00, 'SAIDA', formatarData(18), combustivelId);
    }

    if (pastelariaId) {
      await addTransacao('Material para escola bíblica', 125.00, 'SAIDA', formatarData(9), pastelariaId);
    }

    console.log('✅ Dados de demonstração adicionados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar dados de demonstração:', error);
  }
};
