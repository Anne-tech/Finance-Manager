import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system/next';
import { getRelatorio, getSaldoMesAnterior } from '../database/operations';
import { useUser } from '../context/UserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MESES = [
  { valor: '01', nome: 'Janeiro' },
  { valor: '02', nome: 'Fevereiro' },
  { valor: '03', nome: 'Março' },
  { valor: '04', nome: 'Abril' },
  { valor: '05', nome: 'Maio' },
  { valor: '06', nome: 'Junho' },
  { valor: '07', nome: 'Julho' },
  { valor: '08', nome: 'Agosto' },
  { valor: '09', nome: 'Setembro' },
  { valor: '10', nome: 'Outubro' },
  { valor: '11', nome: 'Novembro' },
  { valor: '12', nome: 'Dezembro' },
];

export default function RelatorioMensalModal({ visible, onClose }: Props) {
  const { usuarioAtivo } = useUser();
  const anoAtual = new Date().getFullYear();
  const mesAtual = String(new Date().getMonth() + 1).padStart(2, '0');

  const [mes, setMes] = useState(mesAtual);
  const [ano, setAno] = useState(String(anoAtual));
  const [formato, setFormato] = useState<'pdf' | 'word'>('pdf');
  const [gerando, setGerando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const gerarHTML = (dados: any, mesNome: string, ano: string, saldoAnterior: number) => {
    const caixaTotalMes = dados.resumo.totalEntradas + saldoAnterior - dados.resumo.totalSaidas;

    // Agrupar transações por categoria
    const entradasPorCategoria: Record<string, number> = {};
    const saidasPorCategoria: Record<string, number> = {};

    dados.transacoes.forEach((t: any) => {
      const categoria = t.categoria?.nome || 'Sem Categoria';
      if (t.tipo === 'ENTRADA') {
        entradasPorCategoria[categoria] = (entradasPorCategoria[categoria] || 0) + t.valor;
      } else {
        saidasPorCategoria[categoria] = (saidasPorCategoria[categoria] || 0) + t.valor;
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .section {
            margin: 20px 0;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .valor {
            text-align: right;
          }
          .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          .saldo {
            margin-top: 12px;
            padding: 15px;
            background-color: #f0f0f0;
            border-radius: 5px;
          }
          .saldo:first-of-type {
            margin-top: 30px;
          }
          .saldo-positivo {
            background-color: #d1fae5;
          }
          .saldo-negativo {
            background-color: #fee2e2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">RESUMO FINANCEIRO MÊS ${mesNome.toUpperCase()}/${ano}</div>
        </div>

        <div class="section">
          <div class="section-title">ENTRADAS</div>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th class="valor">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(entradasPorCategoria)
                .map(([categoria, valor]) => `
                  <tr>
                    <td>${categoria}</td>
                    <td class="valor">${formatarValor(valor)}</td>
                  </tr>
                `).join('')}
              <tr class="total-row">
                <td>TOTAL DE ENTRADAS</td>
                <td class="valor">${formatarValor(dados.resumo.totalEntradas)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">SAÍDAS</div>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th class="valor">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(saidasPorCategoria)
                .map(([categoria, valor]) => `
                  <tr>
                    <td>${categoria}</td>
                    <td class="valor">${formatarValor(valor)}</td>
                  </tr>
                `).join('')}
              <tr class="total-row">
                <td>TOTAL DE SAÍDAS</td>
                <td class="valor">${formatarValor(dados.resumo.totalSaidas)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="saldo">
          <table>
            <tr>
              <td>SALDO DO MÊS ANTERIOR</td>
              <td class="valor">${formatarValor(saldoAnterior)}</td>
            </tr>
          </table>
        </div>

        <div class="saldo ${caixaTotalMes >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">
          <table>
            <tr>
              <td><strong>CAIXA TOTAL MÊS</strong></td>
              <td class="valor"><strong>${formatarValor(caixaTotalMes)}</strong></td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  const gerarRelatorio = async () => {
    setMensagemErro('');
    setMensagemSucesso('');
    try {
      setGerando(true);

      // Calcular primeiro e último dia do mês
      const dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

      // Buscar dados do relatório
      const dados = await getRelatorio(dataInicio, dataFim, usuarioAtivo?.id);

      if (!dados || dados.transacoes.length === 0) {
        const mesNome = MESES.find(m => m.valor === mes)?.nome || '';
        setMensagemErro(
          `Não há transações registradas em ${mesNome}/${ano}. Tente selecionar um período diferente ou adicione transações primeiro.`
        );
        setGerando(false);
        return;
      }

      const saldoAnterior = await getSaldoMesAnterior(usuarioAtivo?.id, dataInicio);

      const mesNome = MESES.find(m => m.valor === mes)?.nome || '';
      const html = gerarHTML(dados, mesNome, ano, saldoAnterior);
      const eletronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

      if (formato === 'pdf') {
        if (Platform.OS === 'web' && eletronAPI) {
          // No Electron, renderiza o HTML para PDF de verdade (sem abrir o diálogo de impressão)
          // e salva via diálogo nativo "Salvar como".
          const resultado = await eletronAPI.printToPDF({
            html,
            defaultPath: `relatorio_${mesNome}_${ano}.pdf`,
          });
          if (resultado.canceled) {
            setGerando(false);
            return;
          }
        } else if (Platform.OS === 'web') {
          // Fallback em navegador comum (sem Electron): abre o relatório numa aba própria
          // e aciona a impressão dessa aba (não da aplicação inteira).
          const janela = window.open('', '_blank');
          if (janela) {
            janela.document.write(html);
            janela.document.close();
            janela.focus();
            janela.print();
          }
        } else {
          const { uri } = await Print.printToFileAsync({ html });
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Relatório ${mesNome}/${ano}`,
            UTI: 'com.adobe.pdf',
          });
        }
      } else {
        // Gerar arquivo Word (HTML que abre no Word)
        const nomeArquivo = `relatorio_${mesNome}_${ano}.doc`;

        if (Platform.OS === 'web' && eletronAPI) {
          const resultado = await eletronAPI.saveFile({
            defaultPath: nomeArquivo,
            filters: [{ name: 'Documento Word', extensions: ['doc'] }],
            content: html,
            encoding: 'utf-8',
          });
          if (resultado.canceled) {
            setGerando(false);
            return;
          }
        } else if (Platform.OS === 'web') {
          const blob = new Blob([html], { type: 'application/msword' });
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
          await file.create();
          await file.write(html);
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/msword',
            dialogTitle: `Relatório ${mesNome}/${ano}`,
          });
        }
      }

      setMensagemSucesso('Relatório gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);

      // Mensagens de erro mais específicas
      let mensagem = 'Não foi possível gerar o relatório.';

      if (error?.message?.includes('NullPointerException')) {
        mensagem = 'Erro ao acessar o banco de dados. Tente novamente.';
      } else if (error?.message?.includes('no such table')) {
        mensagem = 'Banco de dados não inicializado. Reinicie o aplicativo.';
      } else if (error?.message?.includes('Permission denied')) {
        mensagem = 'Sem permissão para salvar o arquivo. Verifique as permissões do app.';
      } else if (error?.message) {
        mensagem = error.message;
      }

      setMensagemErro(mensagem);
    } finally {
      setGerando(false);
    }
  };

  // Gera lista de anos desde 2000 até o ano atual
  const anos = Array.from({ length: anoAtual - 2000 + 1 }, (_, i) => anoAtual - i);

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
            <Text style={styles.title}>Gerar Relatório Mensal</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Mês</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={mes}
                  onValueChange={(value) => setMes(value)}
                  style={styles.picker}
                >
                  {MESES.map((m) => (
                    <Picker.Item key={m.valor} label={m.nome} value={m.valor} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ano</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={ano}
                  onValueChange={(value) => setAno(value)}
                  style={styles.picker}
                >
                  {anos.map((a) => (
                    <Picker.Item key={a} label={String(a)} value={String(a)} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Formato</Text>
              <View style={styles.formatoContainer}>
                <TouchableOpacity
                  style={[
                    styles.formatoButton,
                    formato === 'pdf' && styles.formatoButtonActive
                  ]}
                  onPress={() => setFormato('pdf')}
                >
                  <Text style={[
                    styles.formatoText,
                    formato === 'pdf' && styles.formatoTextActive
                  ]}>
                    PDF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formatoButton,
                    formato === 'word' && styles.formatoButtonActive
                  ]}
                  onPress={() => setFormato('word')}
                >
                  <Text style={[
                    styles.formatoText,
                    formato === 'word' && styles.formatoTextActive
                  ]}>
                    Word
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!!mensagemErro && <Text style={styles.mensagemErro}>{mensagemErro}</Text>}
            {!!mensagemSucesso && <Text style={styles.mensagemSucesso}>{mensagemSucesso}</Text>}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={gerando}
              >
                <Text style={styles.cancelButtonText}>{mensagemSucesso ? 'Fechar' : 'Cancelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={gerarRelatorio}
                disabled={gerando}
              >
                <Text style={styles.submitButtonText}>
                  {gerando ? 'Gerando...' : 'Gerar'}
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
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
    paddingHorizontal: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  formatoTextActive: {
    color: '#10b981',
  },
  mensagemErro: {
    color: '#b91c1c',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  mensagemSucesso: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
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
