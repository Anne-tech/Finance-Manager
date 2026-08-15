import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { getCategorias, addTransacao, addCategoria, type Categoria } from '../database/operations';
import { useUser } from '../context/UserContext';
import GerenciarCategoriasModal from './GerenciarCategoriasModal';
import { parseValorMonetario } from '../utils/valor';

interface Props {
  visible: boolean;
  mesReferencia: number;
  anoReferencia: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FormSaidaModal({ visible, mesReferencia, anoReferencia, onClose, onSuccess }: Props) {
  const { usuarioAtivo } = useUser();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date());
  const [categoriaId, setCategoriaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mostrarNovaCategoria, setMostrarNovaCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [mostrarGerenciarCategorias, setMostrarGerenciarCategorias] = useState(false);

  useEffect(() => {
    if (visible) {
      carregarCategorias();
      const hoje = new Date();
      if (mesReferencia === hoje.getMonth() && anoReferencia === hoje.getFullYear()) {
        setData(hoje);
      } else {
        setData(new Date(anoReferencia, mesReferencia, 1));
      }
    }
  }, [visible, mesReferencia, anoReferencia]);

  const carregarCategorias = async () => {
    try {
      const categoriasSaida = await getCategorias('SAIDA', usuarioAtivo?.id);
      setCategorias(categoriasSaida);
      setCategoriaId(prev => {
        if (prev && categoriasSaida.some(c => c.id === prev)) return prev;
        return categoriasSaida[0]?.id || '';
      });
    } catch (error: any) {
      Alert.alert(
        'Erro ao Carregar Categorias',
        `Detalhes: ${error?.message || String(error)}`
      );
    }
  };

  const handleAdicionarCategoria = async () => {
    if (!novaCategoriaNome.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome da categoria');
      return;
    }

    try {
      const novoId = await addCategoria(novaCategoriaNome, 'SAIDA', usuarioAtivo?.id);
      await carregarCategorias();
      setCategoriaId(novoId);
      setNovaCategoriaNome('');
      setMostrarNovaCategoria(false);
      Alert.alert('Sucesso', 'Categoria adicionada com sucesso!');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNIQUE constraint failed')) {
        Alert.alert('Erro', 'Esta categoria já existe');
      } else {
        Alert.alert(
          'Erro ao Adicionar Categoria',
          `Detalhes: ${errorMessage}`
        );
      }
    }
  };

  const handleSubmit = async () => {
    const valorNumerico = parseValorMonetario(valor);
    if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert('Erro', 'Por favor, informe um valor válido');
      return;
    }

    if (!categoriaId) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria');
      return;
    }

    setLoading(true);
    try {
      // Formata data no fuso horário local (evita problema de -1 dia)
      const year = data.getFullYear();
      const month = String(data.getMonth() + 1).padStart(2, '0');
      const day = String(data.getDate()).padStart(2, '0');
      const dataISO = `${year}-${month}-${day}`;

      await addTransacao(
        descricao || '',
        valorNumerico,
        'SAIDA',
        dataISO,
        categoriaId,
        usuarioAtivo?.id
      );

      // Limpar form
      setDescricao('');
      setValor('');
      setData(new Date());

      Alert.alert('Sucesso', 'Saída adicionada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      Alert.alert(
        'Erro ao Adicionar Saída',
        `Detalhes: ${errorMessage}\n\nTipo: ${error?.name || 'Desconhecido'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setData(selectedDate);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Nova Saída</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.field}>
              <Text style={styles.label}>Data</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{data.toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={data}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Categoria</Text>
                <TouchableOpacity onPress={() => setMostrarGerenciarCategorias(true)}>
                  <Ionicons name="settings-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={categoriaId}
                  onValueChange={(value) => {
                    if (value === 'NOVA_CATEGORIA') {
                      setMostrarNovaCategoria(true);
                    } else {
                      setCategoriaId(value);
                      setMostrarNovaCategoria(false);
                    }
                  }}
                  style={styles.picker}
                >
                  {categorias.map(cat => (
                    <Picker.Item key={cat.id} label={cat.nome} value={cat.id} />
                  ))}
                  <Picker.Item
                    label="➕ Adicionar nova categoria..."
                    value="NOVA_CATEGORIA"
                    color="#ef4444"
                  />
                </Picker>
              </View>
            </View>

            {mostrarNovaCategoria && (
              <View style={styles.field}>
                <Text style={styles.label}>Nome da Nova Categoria</Text>
                <View style={styles.novaCategoriaContainer}>
                  <TextInput
                    style={styles.novaCategoriaInput}
                    value={novaCategoriaNome}
                    onChangeText={setNovaCategoriaNome}
                    placeholder="Ex: MANUTENÇÃO PREDIAL"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.addCategoriaButton}
                    onPress={handleAdicionarCategoria}
                  >
                    <Text style={styles.addCategoriaText}>✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Valor</Text>
              <View style={styles.valorContainer}>
                <Text style={styles.currency}>R$</Text>
                <TextInput
                  style={styles.valorInput}
                  value={valor}
                  onChangeText={setValor}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={styles.input}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex: Conta de água, Salário pastor..."
              />
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={onClose}
              >
                <Text style={styles.buttonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSubmit]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonSubmitText}>
                  {loading ? 'Salvando...' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <GerenciarCategoriasModal
        visible={mostrarGerenciarCategorias}
        tipo="SAIDA"
        usuarioId={usuarioAtivo?.id}
        onClose={() => setMostrarGerenciarCategorias(false)}
        onChange={carregarCategorias}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    color: '#111827',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  valorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginRight: 8,
  },
  valorInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#e5e7eb',
  },
  buttonSubmit: {
    backgroundColor: '#ef4444',
  },
  buttonCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  buttonSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
  novaCategoriaContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  novaCategoriaInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addCategoriaButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoriaText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
