import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getTransacoes, deleteAllTransacoes, deleteTransacao, type Transacao } from '../database/operations';
import { useUser } from '../context/UserContext';
import FormEntradaModal from '../components/FormEntradaModal';
import FormSaidaModal from '../components/FormSaidaModal';
import FormEditarTransacaoModal from '../components/FormEditarTransacaoModal';
import GerenciarUsuariosModal from '../components/GerenciarUsuariosModal';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Dashboard() {
  const router = useRouter();
  const { usuarioAtivo } = useUser();

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarFormEntrada, setMostrarFormEntrada] = useState(false);
  const [mostrarFormSaida, setMostrarFormSaida] = useState(false);
  const [mostrarFormEditar, setMostrarFormEditar] = useState(false);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null);

  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  const carregarTransacoes = useCallback(async () => {
    try {
      const data = await getTransacoes(usuarioAtivo?.id);
      setTransacoes(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as transações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [usuarioAtivo?.id]);

  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarTransacoes();
  }, [carregarTransacoes]);

  const mesStr = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}`;
  const transacoesFiltradas = transacoes.filter(t => t.data.startsWith(mesStr));

  const irMesAnterior = () => {
    if (mesSelecionado === 0) {
      setMesSelecionado(11);
      setAnoSelecionado(a => a - 1);
    } else {
      setMesSelecionado(m => m - 1);
    }
  };

  const irProximoMes = () => {
    if (mesSelecionado === 11) {
      setMesSelecionado(0);
      setAnoSelecionado(a => a + 1);
    } else {
      setMesSelecionado(m => m + 1);
    }
  };

  const calcularSaldoTotal = () =>
    transacoesFiltradas.reduce((acc, t) => t.tipo === 'ENTRADA' ? acc + t.valor : acc - t.valor, 0);

  const calcularTotalEntradas = () =>
    transacoesFiltradas.filter(t => t.tipo === 'ENTRADA').reduce((acc, t) => acc + t.valor, 0);

  const calcularTotalSaidas = () =>
    transacoesFiltradas.filter(t => t.tipo === 'SAIDA').reduce((acc, t) => acc + t.valor, 0);

  const calcularSaldoMesAnterior = () => {
    let mes = mesSelecionado - 1;
    let ano = anoSelecionado;
    if (mes < 0) {
      mes = 11;
      ano -= 1;
    }
    const mesAnteriorStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    return transacoes
      .filter(t => t.data.startsWith(mesAnteriorStr))
      .reduce((acc, t) => t.tipo === 'ENTRADA' ? acc + t.valor : acc - t.valor, 0);
  };

  const formatarValor = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const limparTodasTransacoes = () => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir TODAS as transações? Esta ação não pode ser desfeita!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllTransacoes(usuarioAtivo?.id);
              await carregarTransacoes();
              Alert.alert('Sucesso', 'Todas as transações foram excluídas');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir as transações');
            }
          },
        },
      ]
    );
  };

  const excluirTransacao = (transacao: Transacao) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir "${transacao.descricao}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransacao(transacao.id);
              await carregarTransacoes();
              Alert.alert('Sucesso', 'Transação excluída com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a transação');
            }
          },
        },
      ]
    );
  };

  const editarTransacao = (transacao: Transacao) => {
    setTransacaoSelecionada(transacao);
    setMostrarFormEditar(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  const saldoTotal = calcularSaldoTotal();
  const saldoMesAnterior = calcularSaldoMesAnterior();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Controle Financeiro</Text>
          <Text style={styles.subtitle}>Acompanhe suas entradas e saídas</Text>
        </View>

        {/* Seletor de usuário */}
        <TouchableOpacity style={styles.usuarioBar} onPress={() => setMostrarUsuarios(true)}>
          <View style={styles.usuarioBarLeft}>
            <View style={styles.usuarioAvatar}>
              <Text style={styles.usuarioAvatarText}>
                {usuarioAtivo ? usuarioAtivo.nome.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.usuarioBarLabel}>Conta ativa</Text>
              <Text style={styles.usuarioBarNome}>
                {usuarioAtivo ? usuarioAtivo.nome : 'Nenhuma conta selecionada'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6b7280" />
        </TouchableOpacity>

        {!usuarioAtivo ? (
          <View style={styles.semUsuarioContainer}>
            <Text style={styles.semUsuarioTexto}>
              Selecione ou crie uma conta para começar
            </Text>
            <TouchableOpacity
              style={styles.criarContaButton}
              onPress={() => setMostrarUsuarios(true)}
            >
              <Text style={styles.criarContaButtonText}>Gerenciar Contas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.filtroMes}>
              <TouchableOpacity onPress={irMesAnterior} style={styles.filtroMesBotao}>
                <Ionicons name="chevron-back" size={22} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.filtroMesTexto}>{MESES[mesSelecionado]} {anoSelecionado}</Text>
              <TouchableOpacity onPress={irProximoMes} style={styles.filtroMesBotao}>
                <Ionicons name="chevron-forward" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonReport]}
                onPress={() => router.push('/relatorio')}
              >
                <Text style={styles.buttonText}>Relatórios</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonEntrada]}
                onPress={() => setMostrarFormEntrada(true)}
              >
                <Text style={styles.buttonText}>+ Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSaida]}
                onPress={() => setMostrarFormSaida(true)}
              >
                <Text style={styles.buttonText}>- Saída</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={limparTodasTransacoes}
            >
              <Text style={styles.buttonText}>Limpar Tudo</Text>
            </TouchableOpacity>

            <View style={styles.cardsContainer}>
              <View style={[styles.card, saldoTotal >= 0 ? styles.cardPositive : styles.cardNegative]}>
                <Text style={styles.cardTitle}>Saldo Total</Text>
                <Text style={[styles.cardValue, saldoTotal >= 0 ? styles.valuePositive : styles.valueNegative]}>
                  {formatarValor(saldoTotal)}
                </Text>
              </View>
              <View style={[styles.card, styles.cardEntrada]}>
                <Text style={styles.cardTitle}>Total de Entradas</Text>
                <Text style={[styles.cardValue, styles.valuePositive]}>
                  {formatarValor(calcularTotalEntradas())}
                </Text>
              </View>
              <View style={[styles.card, styles.cardSaida]}>
                <Text style={styles.cardTitle}>Total de Saídas</Text>
                <Text style={[styles.cardValue, styles.valueNegative]}>
                  {formatarValor(calcularTotalSaidas())}
                </Text>
              </View>
              <View style={[styles.card, saldoMesAnterior >= 0 ? styles.cardPositive : styles.cardNegative]}>
                <Text style={styles.cardTitle}>Saldo Total Mês Anterior</Text>
                <Text style={[styles.cardValue, saldoMesAnterior >= 0 ? styles.valuePositive : styles.valueNegative]}>
                  {formatarValor(saldoMesAnterior)}
                </Text>
              </View>
            </View>

            <View style={styles.transacoesContainer}>
              <Text style={styles.sectionTitle}>Transações de {MESES[mesSelecionado]}</Text>
              {transacoesFiltradas.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
              ) : (
                transacoesFiltradas.map(transacao => (
                  <View key={transacao.id} style={styles.transacaoCard}>
                    <View style={styles.transacaoHeader}>
                      <Text style={styles.transacaoData}>{formatarData(transacao.data)}</Text>
                      <View style={[styles.badge, transacao.tipo === 'ENTRADA' ? styles.badgeEntrada : styles.badgeSaida]}>
                        <Text style={styles.badgeText}>
                          {transacao.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.transacaoCategoria}>{transacao.categoria?.nome}</Text>
                    <Text style={styles.transacaoDescricao}>{transacao.descricao}</Text>
                    <Text style={[styles.transacaoValor, transacao.tipo === 'ENTRADA' ? styles.valuePositive : styles.valueNegative]}>
                      {transacao.tipo === 'ENTRADA' ? '+' : '-'}{formatarValor(transacao.valor)}
                    </Text>
                    <View style={styles.transacaoActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => editarTransacao(transacao)}>
                        <Ionicons name="create-outline" size={18} color="#6b7280" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => excluirTransacao(transacao)}>
                        <Ionicons name="trash-outline" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <GerenciarUsuariosModal
        visible={mostrarUsuarios}
        onClose={() => setMostrarUsuarios(false)}
      />

      <FormEntradaModal
        visible={mostrarFormEntrada}
        onClose={() => setMostrarFormEntrada(false)}
        onSuccess={carregarTransacoes}
      />

      <FormSaidaModal
        visible={mostrarFormSaida}
        onClose={() => setMostrarFormSaida(false)}
        onSuccess={carregarTransacoes}
      />

      <FormEditarTransacaoModal
        visible={mostrarFormEditar}
        transacao={transacaoSelecionada}
        onClose={() => { setMostrarFormEditar(false); setTransacaoSelecionada(null); }}
        onSuccess={carregarTransacoes}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  usuarioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  usuarioBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usuarioAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usuarioAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  usuarioBarLabel: { fontSize: 11, color: '#9ca3af' },
  usuarioBarNome: { fontSize: 15, fontWeight: '600', color: '#111827' },
  semUsuarioContainer: {
    margin: 24,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  semUsuarioTexto: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  criarContaButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  criarContaButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  filtroMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 16,
  },
  filtroMesBotao: { padding: 6 },
  filtroMesTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 150,
    textAlign: 'center',
  },
  buttonsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  button: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  buttonReport: { backgroundColor: '#64748b' },
  buttonEntrada: { backgroundColor: '#10b981' },
  buttonSaida: { backgroundColor: '#ef4444' },
  buttonDanger: {
    backgroundColor: '#b91c1c',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cardsContainer: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPositive: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  cardNegative: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  cardEntrada: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  cardSaida: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  cardTitle: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 'bold' },
  valuePositive: { color: '#10b981' },
  valueNegative: { color: '#ef4444' },
  transacoesContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#6b7280', padding: 32 },
  transacaoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transacaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  transacaoData: { fontSize: 12, color: '#6b7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeEntrada: { backgroundColor: '#d1fae5' },
  badgeSaida: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  transacaoDescricao: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  transacaoCategoria: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  transacaoValor: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  transacaoActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  actionButton: { padding: 6, borderRadius: 4 },
});
