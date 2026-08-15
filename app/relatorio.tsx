import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getRelatorio, getSaldoMesAnterior } from '../database/operations';
import { useUser } from '../context/UserContext';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import RelatorioMensalModal from '../components/RelatorioMensalModal';
import GerarApresentacaoModal from '../components/GerarApresentacaoModal';

interface RelatorioData {
  transacoes: any[];
  resumo: {
    totalEntradas: number;
    totalSaidas: number;
    saldoPeriodo: number;
    quantidadeTransacoes: number;
  };
  porCategoria: Record<string, {
    entradas: number;
    saidas: number;
    total: number;
  }>;
}

export default function Relatorio() {
  const { usuarioAtivo } = useUser();
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState(new Date());
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDateInicio, setShowDateInicio] = useState(false);
  const [showDateFim, setShowDateFim] = useState(false);
  const [mostrarRelatorioMensal, setMostrarRelatorioMensal] = useState(false);
  const [mostrarApresentacao, setMostrarApresentacao] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string | Date) => {
    // Formata diretamente da string ISO (YYYY-MM-DD) sem conversão de timezone
    if (typeof data === 'string') {
      const [ano, mes, dia] = data.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    // Para objetos Date, usa formatação manual no fuso horário local
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const gerarRelatorio = async () => {
    setMensagemErro('');
    setMensagemSucesso('');

    if (dataInicio > dataFim) {
      setMensagemErro('A data inicial não pode ser maior que a data final.');
      return;
    }

    setLoading(true);
    try {
      // Formata datas no fuso horário local (evita problema de -1 dia)
      const yearInicio = dataInicio.getFullYear();
      const monthInicio = String(dataInicio.getMonth() + 1).padStart(2, '0');
      const dayInicio = String(dataInicio.getDate()).padStart(2, '0');
      const dataInicioISO = `${yearInicio}-${monthInicio}-${dayInicio}`;

      const yearFim = dataFim.getFullYear();
      const monthFim = String(dataFim.getMonth() + 1).padStart(2, '0');
      const dayFim = String(dataFim.getDate()).padStart(2, '0');
      const dataFimISO = `${yearFim}-${monthFim}-${dayFim}`;

      const data = await getRelatorio(dataInicioISO, dataFimISO, usuarioAtivo?.id);

      // Verificar se há dados
      if (!data || data.transacoes.length === 0) {
        setMensagemErro(
          'Não há transações registradas no período selecionado. Tente selecionar um período diferente ou adicione transações primeiro.'
        );
        setRelatorio(null);
        return;
      }

      const saldoAnteriorPeriodo = await getSaldoMesAnterior(usuarioAtivo?.id, dataInicioISO);
      setSaldoAnterior(saldoAnteriorPeriodo);
      setRelatorio(data);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);

      // Mensagens de erro mais específicas
      let mensagem = 'Não foi possível gerar o relatório.';

      if (error?.message?.includes('NullPointerException')) {
        mensagem = 'Erro ao acessar o banco de dados. Tente novamente.';
      } else if (error?.message?.includes('no such table')) {
        mensagem = 'Banco de dados não inicializado. Reinicie o aplicativo.';
      } else if (error?.message) {
        mensagem = `Erro: ${error.message}`;
      }

      setMensagemErro(mensagem);
      setRelatorio(null);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = async () => {
    if (!relatorio) return;
    setMensagemErro('');
    setMensagemSucesso('');

    try {
      const csvContent = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'].join(','),
        ...relatorio.transacoes.map(t => [
          formatarData(t.data),
          t.descricao,
          t.categoria.nome,
          t.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
          t.valor.toString().replace('.', ',')
        ].join(','))
      ].join('\n');

      // Formata datas no fuso horário local para o nome do arquivo
      const yearInicio = dataInicio.getFullYear();
      const monthInicio = String(dataInicio.getMonth() + 1).padStart(2, '0');
      const dayInicio = String(dataInicio.getDate()).padStart(2, '0');
      const dataInicioISO = `${yearInicio}-${monthInicio}-${dayInicio}`;

      const yearFim = dataFim.getFullYear();
      const monthFim = String(dataFim.getMonth() + 1).padStart(2, '0');
      const dayFim = String(dataFim.getDate()).padStart(2, '0');
      const dataFimISO = `${yearFim}-${monthFim}-${dayFim}`;

      const fileName = `relatorio_${dataInicioISO}_${dataFimISO}.csv`;
      const eletronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

      if (Platform.OS === 'web' && eletronAPI) {
        const resultado = await eletronAPI.saveFile({
          defaultPath: fileName,
          filters: [{ name: 'CSV', extensions: ['csv'] }],
          content: csvContent,
          encoding: 'utf-8',
        });
        if (resultado.canceled) return;
      } else if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.document, fileName);
        await file.create();
        await file.write(csvContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        }
      }

      setMensagemSucesso('Relatório CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      setMensagemErro('Não foi possível exportar o relatório.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.filterContainer}>
          <View style={styles.dateField}>
            <Text style={styles.label}>Data Início</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDateInicio(true)}
            >
              <Text>{formatarData(dataInicio)}</Text>
            </TouchableOpacity>
            {showDateInicio && (
              <DateTimePicker
                value={dataInicio}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDateInicio(Platform.OS === 'ios');
                  if (date) setDataInicio(date);
                }}
              />
            )}
          </View>

          <View style={styles.dateField}>
            <Text style={styles.label}>Data Fim</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDateFim(true)}
            >
              <Text>{formatarData(dataFim)}</Text>
            </TouchableOpacity>
            {showDateFim && (
              <DateTimePicker
                value={dataFim}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDateFim(Platform.OS === 'ios');
                  if (date) setDataFim(date);
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={gerarRelatorio}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setMostrarRelatorioMensal(true)}
          >
            <Text style={styles.buttonText}>Relatório Mensal (PDF/Word)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonApresentacao]}
            onPress={() => setMostrarApresentacao(true)}
          >
            <Text style={styles.buttonText}>Apresentação (PPTX)</Text>
          </TouchableOpacity>
        </View>

        {!!mensagemErro && <Text style={styles.mensagemErro}>{mensagemErro}</Text>}
        {!!mensagemSucesso && <Text style={styles.mensagemSucesso}>{mensagemSucesso}</Text>}

        {loading && <ActivityIndicator size="large" color="#10b981" style={styles.loader} />}

        {relatorio && !loading && (
          <View style={styles.relatorioContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.periodoText}>
                {formatarData(dataInicio)} a {formatarData(dataFim)}
              </Text>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={exportarCSV}
              >
                <Text style={styles.exportButtonText}>Exportar CSV</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.resumoContainer}>
              <View style={[styles.resumoCard, styles.cardEntradas]}>
                <Text style={styles.resumoLabel}>Total Entradas</Text>
                <Text style={[styles.resumoValor, styles.valuePositive]}>
                  {formatarValor(relatorio.resumo.totalEntradas)}
                </Text>
              </View>

              <View style={[styles.resumoCard, styles.cardSaidas]}>
                <Text style={styles.resumoLabel}>Total Saídas</Text>
                <Text style={[styles.resumoValor, styles.valueNegative]}>
                  {formatarValor(relatorio.resumo.totalSaidas)}
                </Text>
              </View>

              <View style={[
                styles.resumoCard,
                relatorio.resumo.saldoPeriodo >= 0 ? styles.cardPositive : styles.cardNegative
              ]}>
                <Text style={styles.resumoLabel}>Saldo do Período</Text>
                <Text style={[
                  styles.resumoValor,
                  relatorio.resumo.saldoPeriodo >= 0 ? styles.valuePositive : styles.valueNegative
                ]}>
                  {formatarValor(relatorio.resumo.saldoPeriodo)}
                </Text>
              </View>

              <View style={[styles.resumoCard, styles.cardTotal]}>
                <Text style={styles.resumoLabel}>Saldo do Mês Anterior</Text>
                <Text style={[
                  styles.resumoValor,
                  saldoAnterior >= 0 ? styles.valuePositive : styles.valueNegative
                ]}>
                  {formatarValor(saldoAnterior)}
                </Text>
              </View>

              <View style={[
                styles.resumoCard,
                (relatorio.resumo.totalEntradas + saldoAnterior - relatorio.resumo.totalSaidas) >= 0
                  ? styles.cardPositive
                  : styles.cardNegative
              ]}>
                <Text style={styles.resumoLabel}>Caixa Total</Text>
                <Text style={[
                  styles.resumoValor,
                  (relatorio.resumo.totalEntradas + saldoAnterior - relatorio.resumo.totalSaidas) >= 0
                    ? styles.valuePositive
                    : styles.valueNegative
                ]}>
                  {formatarValor(relatorio.resumo.totalEntradas + saldoAnterior - relatorio.resumo.totalSaidas)}
                </Text>
              </View>

              <View style={[styles.resumoCard, styles.cardTotal]}>
                <Text style={styles.resumoLabel}>Total Transações</Text>
                <Text style={styles.resumoValor}>
                  {relatorio.resumo.quantidadeTransacoes}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumo por Categoria</Text>
              {Object.entries(relatorio.porCategoria).map(([categoria, dados]) => (
                <View key={categoria} style={styles.categoriaCard}>
                  <Text style={styles.categoriaNome}>{categoria}</Text>
                  <View style={styles.categoriaValores}>
                    <Text style={styles.valuePositive}>
                      E: {formatarValor(dados.entradas)}
                    </Text>
                    <Text style={styles.valueNegative}>
                      S: {formatarValor(dados.saidas)}
                    </Text>
                    <Text style={[
                      styles.categoriaTotal,
                      dados.total >= 0 ? styles.valuePositive : styles.valueNegative
                    ]}>
                      {formatarValor(dados.total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Transações ({relatorio.transacoes.length})
              </Text>
              {relatorio.transacoes.map((transacao) => (
                <View key={transacao.id} style={styles.transacaoCard}>
                  <View style={styles.transacaoHeader}>
                    <Text style={styles.transacaoData}>
                      {formatarData(transacao.data)}
                    </Text>
                    <View style={[
                      styles.badge,
                      transacao.tipo === 'ENTRADA' ? styles.badgeEntrada : styles.badgeSaida
                    ]}>
                      <Text style={styles.badgeText}>
                        {transacao.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.transacaoDescricao}>{transacao.descricao}</Text>
                  <Text style={styles.transacaoCategoria}>{transacao.categoria.nome}</Text>
                  <Text style={[
                    styles.transacaoValor,
                    transacao.tipo === 'ENTRADA' ? styles.valuePositive : styles.valueNegative
                  ]}>
                    {transacao.tipo === 'ENTRADA' ? '+' : '-'}{formatarValor(transacao.valor)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <RelatorioMensalModal
        visible={mostrarRelatorioMensal}
        onClose={() => setMostrarRelatorioMensal(false)}
      />

      <GerarApresentacaoModal
        visible={mostrarApresentacao}
        onClose={() => setMostrarApresentacao(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  dateField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  buttonsContainer: {
    margin: 16,
    gap: 12,
  },
  mensagemErro: {
    color: '#b91c1c',
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  mensagemSucesso: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#64748b',
  },
  buttonSecondary: {
    backgroundColor: '#10b981',
  },
  buttonApresentacao: {
    backgroundColor: '#7c3aed',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    marginVertical: 32,
  },
  relatorioContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  exportButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  resumoContainer: {
    gap: 12,
    marginBottom: 24,
  },
  resumoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardEntradas: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardSaidas: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  cardPositive: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardNegative: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  cardTotal: {
    borderLeftWidth: 4,
    borderLeftColor: '#6b7280',
  },
  resumoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  resumoValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  valuePositive: {
    color: '#10b981',
  },
  valueNegative: {
    color: '#ef4444',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  categoriaCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoriaNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  categoriaValores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriaTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transacaoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transacaoData: {
    fontSize: 12,
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeEntrada: {
    backgroundColor: '#d1fae5',
  },
  badgeSaida: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transacaoDescricao: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transacaoCategoria: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  transacaoValor: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
