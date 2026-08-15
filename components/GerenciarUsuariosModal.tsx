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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUsuarios, addUsuario, deleteUsuario, type Usuario } from '../database/operations';
import { useUser } from '../context/UserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function GerenciarUsuariosModal({ visible, onClose }: Props) {
  const { usuarioAtivo, setUsuarioAtivo } = useUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nomeNovo, setNomeNovo] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [loading, setLoading] = useState(false);

  const carregarUsuarios = async () => {
    try {
      const lista = await getUsuarios();
      setUsuarios(lista);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os usuários');
    }
  };

  useEffect(() => {
    if (visible) carregarUsuarios();
  }, [visible]);

  if (!visible) return null;

  const handleSelecionar = (usuario: Usuario) => {
    setUsuarioAtivo(usuario);
    onClose();
  };

  const handleAdicionar = async () => {
    if (!nomeNovo.trim()) {
      Alert.alert('Erro', 'Informe um nome para o usuário');
      return;
    }
    setLoading(true);
    try {
      const novo = await addUsuario(nomeNovo.trim());
      setNomeNovo('');
      setAdicionando(false);
      await carregarUsuarios();
      setUsuarioAtivo(novo);
      Alert.alert('Sucesso', `Usuário "${novo.nome}" criado com sucesso!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = (usuario: Usuario) => {
    Alert.alert(
      'Excluir Usuário',
      `Tem certeza que deseja excluir "${usuario.nome}"?\n\nTodas as transações e categorias deste usuário serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUsuario(usuario.id);
              if (usuarioAtivo?.id === usuario.id) {
                const restantes = usuarios.filter(u => u.id !== usuario.id);
                setUsuarioAtivo(restantes.length > 0 ? restantes[0] : null);
              }
              await carregarUsuarios();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o usuário');
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
            <Text style={styles.title}>Contas</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {usuarios.length === 0 && (
              <Text style={styles.emptyText}>Nenhum usuário cadastrado</Text>
            )}

            {usuarios.map(usuario => {
              const ativo = usuarioAtivo?.id === usuario.id;
              return (
                <View key={usuario.id} style={[styles.usuarioCard, ativo && styles.usuarioCardAtivo]}>
                  <TouchableOpacity style={styles.usuarioInfo} onPress={() => handleSelecionar(usuario)}>
                    <View style={[styles.avatar, ativo && styles.avatarAtivo]}>
                      <Text style={styles.avatarText}>
                        {usuario.nome.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.usuarioNome, ativo && styles.usuarioNomeAtivo]}>
                        {usuario.nome}
                      </Text>
                      {ativo && <Text style={styles.ativoLabel}>Conta ativa</Text>}
                    </View>
                  </TouchableOpacity>

                  {!ativo && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleExcluir(usuario)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  {ativo && (
                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                  )}
                </View>
              );
            })}

            {adicionando ? (
              <View style={styles.novoContainer}>
                <TextInput
                  style={styles.novoInput}
                  value={nomeNovo}
                  onChangeText={setNomeNovo}
                  placeholder="Nome do usuário"
                  autoFocus
                />
                <View style={styles.novoButtons}>
                  <TouchableOpacity
                    style={[styles.novoBtn, styles.novoBtnCancel]}
                    onPress={() => { setAdicionando(false); setNomeNovo(''); }}
                  >
                    <Text style={styles.novoBtnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.novoBtn, styles.novoBtnSave]}
                    onPress={handleAdicionar}
                    disabled={loading}
                  >
                    <Text style={styles.novoBtnSaveText}>
                      {loading ? 'Criando...' : 'Criar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setAdicionando(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#10b981" />
                <Text style={styles.addButtonText}>Novo usuário</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
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
  content: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    paddingVertical: 16,
  },
  usuarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  usuarioCardAtivo: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  usuarioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAtivo: {
    backgroundColor: '#10b981',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  usuarioNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  usuarioNomeAtivo: {
    color: '#065f46',
  },
  ativoLabel: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
  },
  novoContainer: {
    marginTop: 8,
  },
  novoInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 10,
  },
  novoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  novoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  novoBtnCancel: {
    backgroundColor: '#f3f4f6',
  },
  novoBtnSave: {
    backgroundColor: '#10b981',
  },
  novoBtnCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  novoBtnSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    marginTop: 4,
    marginBottom: 8,
  },
  addButtonText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 15,
  },
});
