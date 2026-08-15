import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategorias, updateCategoria, deleteCategoria, type Categoria } from '../database/operations';

interface Props {
  visible: boolean;
  tipo: 'ENTRADA' | 'SAIDA';
  usuarioId?: string;
  onClose: () => void;
  onChange: () => void;
}

export default function GerenciarCategoriasModal({ visible, tipo, usuarioId, onClose, onChange }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');

  useEffect(() => {
    if (visible) {
      carregarCategorias();
      setEditandoId(null);
    }
  }, [visible]);

  const carregarCategorias = async () => {
    try {
      const cats = await getCategorias(tipo, usuarioId);
      setCategorias(cats);
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const iniciarEdicao = (categoria: Categoria) => {
    setEditandoId(categoria.id);
    setNomeEditado(categoria.nome);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeEditado('');
  };

  const salvarEdicao = async (id: string) => {
    if (!nomeEditado.trim()) {
      Alert.alert('Erro', 'O nome da categoria não pode ficar vazio');
      return;
    }
    try {
      await updateCategoria(id, nomeEditado);
      await carregarCategorias();
      onChange();
      cancelarEdicao();
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNIQUE constraint failed')) {
        Alert.alert('Erro', 'Já existe uma categoria com esse nome');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar a categoria');
      }
    }
  };

  const confirmarExclusao = (categoria: Categoria) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir a categoria "${categoria.nome}"? Transações já lançadas com ela permanecerão, mas sem categoria.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategoria(categoria.id);
              await carregarCategorias();
              onChange();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Gerenciar Categorias</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={categorias}
            keyExtractor={(item) => item.id}
            style={styles.lista}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma categoria cadastrada</Text>}
            renderItem={({ item }) => (
              <View style={styles.linha}>
                {editandoId === item.id ? (
                  <>
                    <TextInput
                      style={styles.inputEdicao}
                      value={nomeEditado}
                      onChangeText={setNomeEditado}
                      autoCapitalize="characters"
                      autoFocus
                    />
                    <TouchableOpacity style={styles.iconButton} onPress={() => salvarEdicao(item.id)}>
                      <Ionicons name="checkmark" size={20} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={cancelarEdicao}>
                      <Ionicons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.nomeCategoria}>{item.nome}</Text>
                    <TouchableOpacity style={styles.iconButton} onPress={() => iniciarEdicao(item)}>
                      <Ionicons name="pencil-outline" size={18} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => confirmarExclusao(item)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          />
        </View>
      </KeyboardAvoidingView>
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
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  lista: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 32,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  nomeCategoria: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  inputEdicao: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111827',
  },
  iconButton: {
    padding: 6,
  },
});
