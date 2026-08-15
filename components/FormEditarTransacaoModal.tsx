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
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCategorias, updateTransacao, type Transacao } from '../database/operations';
import { useUser } from '../context/UserContext';

interface Props {
  visible: boolean;
  transacao: Transacao | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FormEditarTransacaoModal({ visible, transacao, onClose, onSuccess }: Props) {
  const { usuarioAtivo } = useUser();
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [data, setData] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregarCategorias = async () => {
      if (!transacao) return;
      try {
        const cats = await getCategorias(transacao.tipo, usuarioAtivo?.id);
        setCategorias(cats);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        Alert.alert('Erro', 'Não foi possível carregar as categorias');
      }
    };

    if (visible && transacao) {
      setDescricao(transacao.descricao);
      setValor(transacao.valor.toString());
      setCategoriaId(transacao.categoria_id);
      // Converte a string de data (YYYY-MM-DD) para Date sem problema de timezone
      const [ano, mes, dia] = transacao.data.split('-').map(Number);
      setData(new Date(ano, mes - 1, dia));
      carregarCategorias();
    }
  }, [visible, transacao]);

  const handleSalvar = async () => {
    if (!transacao) return;

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert('Erro', 'O valor deve ser um número maior que zero');
      return;
    }

    if (!categoriaId) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }

    setLoading(true);
    try {
      // Formata data no fuso horário local (evita problema de -1 dia)
      const year = data.getFullYear();
      const month = String(data.getMonth() + 1).padStart(2, '0');
      const day = String(data.getDate()).padStart(2, '0');
      const dataISO = `${year}-${month}-${day}`;

      await updateTransacao(
        transacao.id,
        descricao.trim(),
        valorNumerico,
        transacao.tipo,
        dataISO,
        categoriaId
      );

      Alert.alert('Sucesso', 'Transação atualizada com sucesso!');
      onSuccess();
      onClose();
      limparFormulario();
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a transação');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setData(new Date());
    setCategorias([]);
  };

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR');
  };

  if (!transacao) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.title}>
              Editar {transacao.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={styles.input}
                value={descricao}
                onChangeText={setDescricao}
                maxLength={100}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input}
                value={valor}
                onChangeText={setValor}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={categoriaId}
                  onValueChange={(value) => setCategoriaId(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione uma categoria" value="" />
                  {categorias.map((cat) => (
                    <Picker.Item key={cat.id} label={cat.nome} value={cat.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Data</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatarData(data)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={data}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setData(selectedDate);
                  }}
                />
              )}
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  onClose();
                  limparFormulario();
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  transacao.tipo === 'ENTRADA' ? styles.entradaButton : styles.saidaButton
                ]}
                onPress={handleSalvar}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
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
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    color: '#111827',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  entradaButton: {
    backgroundColor: '#10b981',
  },
  saidaButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
