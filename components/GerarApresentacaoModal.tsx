import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { gerarECompartilharApresentacao } from '../services/apresentacao';
import { useUser } from '../context/UserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MESES_NOME = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type TipoPeriodo = 'ANO' | 'PERSONALIZADO';

const formatarDataISO = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const formatarDataBR = (data: Date) => data.toLocaleDateString('pt-BR');

export default function GerarApresentacaoModal({ visible, onClose }: Props) {
  const { usuarioAtivo } = useUser();
  const anoAtual = new Date().getFullYear();

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('ANO');
  const [ano, setAno] = useState(String(anoAtual));
  const [dataInicio, setDataInicio] = useState(new Date(anoAtual, 0, 1));
  const [dataFim, setDataFim] = useState(new Date());
  const [showDataInicio, setShowDataInicio] = useState(false);
  const [showDataFim, setShowDataFim] = useState(false);
  const [organizacao, setOrganizacao] = useState(usuarioAtivo?.nome || '');
  const [subtitulo, setSubtitulo] = useState('');
  const [gerando, setGerando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const anos = Array.from({ length: anoAtual - 2000 + 1 }, (_, i) => anoAtual - i);

  const gerar = async () => {
    setMensagemErro('');
    setMensagemSucesso('');

    if (!organizacao.trim()) {
      setMensagemErro('Informe o nome da organização/igreja que aparecerá na capa.');
      return;
    }

    let inicioISO: string;
    let fimISO: string;
    let periodoRotulo: string;

    if (tipoPeriodo === 'ANO') {
      inicioISO = `${ano}-01-01`;
      fimISO = `${ano}-12-31`;
      periodoRotulo = `Ano de ${ano}`;
    } else {
      if (dataInicio > dataFim) {
        setMensagemErro('A data inicial não pode ser maior que a data final.');
        return;
      }
      inicioISO = formatarDataISO(dataInicio);
      fimISO = formatarDataISO(dataFim);
      const mesInicioNome = MESES_NOME[dataInicio.getMonth()];
      const mesFimNome = MESES_NOME[dataFim.getMonth()];
      periodoRotulo = `${mesInicioNome}/${dataInicio.getFullYear()} a ${mesFimNome}/${dataFim.getFullYear()}`;
    }

    setGerando(true);
    try {
      const resultado = await gerarECompartilharApresentacao({
        dataInicio: inicioISO,
        dataFim: fimISO,
        usuarioId: usuarioAtivo?.id,
        organizacao: organizacao.trim(),
        subtitulo: subtitulo.trim() || undefined,
        periodoRotulo,
      });
      if (resultado === null) {
        // Usuário cancelou o diálogo de salvar; permanece no formulário.
        return;
      }
      setMensagemSucesso('Apresentação gerada com sucesso!');
    } catch (error: any) {
      setMensagemErro(error?.message || String(error));
    } finally {
      setGerando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.title}>Gerar Apresentação (PPTX)</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Nome da organização/igreja</Text>
              <TextInput
                style={styles.input}
                value={organizacao}
                onChangeText={setOrganizacao}
                placeholder="Ex: IEMP Vix"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Subtítulo da capa (opcional)</Text>
              <TextInput
                style={styles.input}
                value={subtitulo}
                onChangeText={setSubtitulo}
                placeholder="Ex: Controle financeiro"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Período</Text>
              <View style={styles.formatoContainer}>
                <TouchableOpacity
                  style={[styles.formatoButton, tipoPeriodo === 'ANO' && styles.formatoButtonActive]}
                  onPress={() => setTipoPeriodo('ANO')}
                >
                  <Text style={[styles.formatoText, tipoPeriodo === 'ANO' && styles.formatoTextActive]}>
                    Ano completo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatoButton, tipoPeriodo === 'PERSONALIZADO' && styles.formatoButtonActive]}
                  onPress={() => setTipoPeriodo('PERSONALIZADO')}
                >
                  <Text style={[styles.formatoText, tipoPeriodo === 'PERSONALIZADO' && styles.formatoTextActive]}>
                    Período personalizado
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {tipoPeriodo === 'ANO' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Ano</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={ano} onValueChange={setAno} style={styles.picker}>
                    {anos.map((a) => (
                      <Picker.Item key={a} label={String(a)} value={String(a)} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={styles.rowFields}>
                <View style={[styles.field, styles.fieldMetade]}>
                  <Text style={styles.label}>Data Início</Text>
                  <TouchableOpacity style={styles.input} onPress={() => setShowDataInicio(true)}>
                    <Text style={styles.dateText}>{formatarDataBR(dataInicio)}</Text>
                  </TouchableOpacity>
                  {showDataInicio && (
                    <DateTimePicker
                      value={dataInicio}
                      mode="date"
                      display="default"
                      onChange={(_, date) => {
                        setShowDataInicio(Platform.OS === 'ios');
                        if (date) setDataInicio(date);
                      }}
                    />
                  )}
                </View>
                <View style={[styles.field, styles.fieldMetade]}>
                  <Text style={styles.label}>Data Fim</Text>
                  <TouchableOpacity style={styles.input} onPress={() => setShowDataFim(true)}>
                    <Text style={styles.dateText}>{formatarDataBR(dataFim)}</Text>
                  </TouchableOpacity>
                  {showDataFim && (
                    <DateTimePicker
                      value={dataFim}
                      mode="date"
                      display="default"
                      onChange={(_, date) => {
                        setShowDataFim(Platform.OS === 'ios');
                        if (date) setDataFim(date);
                      }}
                    />
                  )}
                </View>
              </View>
            )}

            {!!mensagemErro && <Text style={styles.mensagemErro}>{mensagemErro}</Text>}
            {!!mensagemSucesso && <Text style={styles.mensagemSucesso}>{mensagemSucesso}</Text>}

            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={gerando}>
                <Text style={styles.cancelButtonText}>{mensagemSucesso ? 'Fechar' : 'Cancelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={gerar} disabled={gerando}>
                {gerando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Gerar</Text>
                )}
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
    maxHeight: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldMetade: {
    flex: 1,
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
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  picker: {
    height: 50,
  },
  formatoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  formatoButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  formatoButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  formatoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  formatoTextActive: {
    color: '#10b981',
  },
  mensagemErro: {
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  mensagemSucesso: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  submitButton: {
    backgroundColor: '#10b981',
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
