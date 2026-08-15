import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  exportarDados,
  importarDados,
  type BackupData,
  type ResultadoImportacao,
} from '../database/operations';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImportado: () => void;
}

type Fase =
  | 'inicial'
  | 'processando'
  | 'confirmar-modo'
  | 'confirmar-substituir'
  | 'resultado'
  | 'erro';

const isBackupValido = (dados: any): dados is BackupData =>
  dados &&
  typeof dados === 'object' &&
  Array.isArray(dados.usuarios) &&
  Array.isArray(dados.categorias) &&
  Array.isArray(dados.transacoes);

export default function BackupModal({ visible, onClose, onImportado }: Props) {
  const [fase, setFase] = useState<Fase>('inicial');
  const [mensagemStatus, setMensagemStatus] = useState('');
  const [dadosPendentes, setDadosPendentes] = useState<BackupData | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [mensagemErro, setMensagemErro] = useState('');

  const reset = () => {
    setFase('inicial');
    setMensagemStatus('');
    setDadosPendentes(null);
    setResultado(null);
    setMensagemErro('');
  };

  const fechar = () => {
    reset();
    onClose();
  };

  if (!visible) return null;

  const exportar = async () => {
    setFase('processando');
    setMensagemStatus('Exportando dados...');
    try {
      const dados = await exportarDados();
      const conteudo = JSON.stringify(dados, null, 2);
      const dataStr = dados.exportadoEm.slice(0, 10);
      const nomeArquivo = `finance-manager-backup-${dataStr}.json`;

      if (Platform.OS === 'web') {
        // expo-file-system/next não é suportado na web; usamos download nativo do navegador.
        const blob = new Blob([conteudo], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.document, nomeArquivo);
        if (file.exists) file.delete();
        await file.create();
        await file.write(conteudo);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Backup de dados do Finance Manager',
          });
        }
      }

      setMensagemStatus(
        `Arquivo "${nomeArquivo}" exportado com ${dados.usuarios.length} conta(s), ${dados.categorias.length} categoria(s) e ${dados.transacoes.length} transação(ões).`
      );
      setFase('resultado');
    } catch (error: any) {
      setMensagemErro(error?.message || String(error));
      setFase('erro');
    }
  };

  const processarImportacao = async (modo: 'mesclar' | 'substituir') => {
    if (!dadosPendentes) return;
    setFase('processando');
    setMensagemStatus(modo === 'mesclar' ? 'Mesclando dados...' : 'Substituindo dados...');
    try {
      const res = await importarDados(dadosPendentes, { modo });
      await onImportado();
      setResultado(res);
      setFase('resultado');
    } catch (error: any) {
      setMensagemErro(error?.message || String(error));
      setFase('erro');
    }
  };

  const importar = async () => {
    try {
      const resultadoPicker = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'text/json'],
        copyToCacheDirectory: true,
        base64: false,
      });
      if (resultadoPicker.canceled || !resultadoPicker.assets?.[0]) return;

      setFase('processando');
      setMensagemStatus('Lendo arquivo...');

      const asset = resultadoPicker.assets[0];
      // expo-file-system/next não é suportado na web; lemos via File API do navegador.
      const conteudo = Platform.OS === 'web' && asset.file
        ? await asset.file.text()
        : await new File(asset.uri).text();
      const dados = JSON.parse(conteudo);

      if (!isBackupValido(dados)) {
        setMensagemErro('Este arquivo não parece ser um backup válido do Finance Manager.');
        setFase('erro');
        return;
      }

      setDadosPendentes(dados);
      setFase('confirmar-modo');
    } catch (error: any) {
      setMensagemErro(error?.message || String(error));
      setFase('erro');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={fechar}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Backup de Dados</Text>
            <TouchableOpacity onPress={fechar}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {fase === 'inicial' && (
            <>
              <Text style={styles.descricao}>
                Exporte todos os dados (contas, categorias e transações) para transferir entre o
                app mobile e o desktop, e vice-versa.
              </Text>

              <TouchableOpacity
                style={[styles.acaoButton, styles.exportButton]}
                onPress={exportar}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.acaoButtonText}>Exportar Dados</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acaoButton, styles.importButton]}
                onPress={importar}
              >
                <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                <Text style={styles.acaoButtonText}>Importar Dados</Text>
              </TouchableOpacity>
            </>
          )}

          {fase === 'processando' && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.statusText}>{mensagemStatus}</Text>
            </View>
          )}

          {fase === 'confirmar-modo' && dadosPendentes && (
            <>
              <Text style={styles.descricao}>
                O arquivo contém {dadosPendentes.usuarios.length} conta(s),{' '}
                {dadosPendentes.categorias.length} categoria(s) e{' '}
                {dadosPendentes.transacoes.length} transação(ões).{'\n\n'}Como deseja importar?
              </Text>

              <TouchableOpacity
                style={[styles.acaoButton, styles.mesclarButton]}
                onPress={() => processarImportacao('mesclar')}
              >
                <Ionicons name="git-merge-outline" size={20} color="#fff" />
                <Text style={styles.acaoButtonText}>Mesclar com dados atuais</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acaoButton, styles.substituirButton]}
                onPress={() => setFase('confirmar-substituir')}
              >
                <Ionicons name="warning-outline" size={20} color="#fff" />
                <Text style={styles.acaoButtonText}>Substituir tudo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelarButton} onPress={reset}>
                <Text style={styles.cancelarButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

          {fase === 'confirmar-substituir' && (
            <>
              <Text style={styles.descricaoAlerta}>
                Todos os dados atuais (contas, categorias e transações) serão apagados e
                substituídos pelos dados do arquivo. Esta ação não pode ser desfeita.
              </Text>

              <TouchableOpacity
                style={[styles.acaoButton, styles.substituirButton]}
                onPress={() => processarImportacao('substituir')}
              >
                <Text style={styles.acaoButtonText}>Sim, substituir tudo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelarButton}
                onPress={() => setFase('confirmar-modo')}
              >
                <Text style={styles.cancelarButtonText}>Voltar</Text>
              </TouchableOpacity>
            </>
          )}

          {fase === 'resultado' && (
            <>
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                <Text style={styles.statusText}>
                  {resultado
                    ? `Importação concluída!\n\nContas: ${resultado.usuarios}\nCategorias: ${resultado.categorias}\nTransações: ${resultado.transacoes}\nAjustes de saldo: ${resultado.ajustes}`
                    : mensagemStatus}
                </Text>
              </View>
              <TouchableOpacity style={[styles.acaoButton, styles.exportButton]} onPress={fechar}>
                <Text style={styles.acaoButtonText}>Fechar</Text>
              </TouchableOpacity>
            </>
          )}

          {fase === 'erro' && (
            <>
              <View style={styles.statusContainer}>
                <Ionicons name="alert-circle" size={40} color="#ef4444" />
                <Text style={styles.statusText}>{mensagemErro}</Text>
              </View>
              <TouchableOpacity style={styles.cancelarButton} onPress={reset}>
                <Text style={styles.cancelarButtonText}>Voltar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  descricao: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  descricaoAlerta: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 20,
    lineHeight: 20,
  },
  acaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  exportButton: {
    backgroundColor: '#10b981',
  },
  importButton: {
    backgroundColor: '#3b82f6',
  },
  mesclarButton: {
    backgroundColor: '#3b82f6',
  },
  substituirButton: {
    backgroundColor: '#b91c1c',
  },
  cancelarButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelarButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  acaoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  statusText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
});
