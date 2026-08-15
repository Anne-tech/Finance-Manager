import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { montarDadosApresentacao } from './dados';
import { gerarPptxApresentacao } from './gerar';
import type { GerarDadosOpts } from './types';

export type { DadosApresentacao, GerarDadosOpts } from './types';

const slugify = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'apresentacao';

const MIME_PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const base64ParaBlob = (base64: string, mimeType: string): Blob => {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mimeType });
};

const baixarNoNavegador = (blob: Blob, nomeArquivo: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Retorna o caminho/nome do arquivo gerado, ou `null` se o usuário cancelou
 * o diálogo de salvar (apenas possível no Electron).
 */
export async function gerarECompartilharApresentacao(opts: GerarDadosOpts): Promise<string | null> {
  const dados = await montarDadosApresentacao(opts);
  const base64 = await gerarPptxApresentacao(dados);
  const nomeArquivo = `apresentacao_${slugify(opts.organizacao)}_${opts.dataInicio}_a_${opts.dataFim}.pptx`;

  if (Platform.OS === 'web') {
    // expo-file-system/next não é suportado na web.
    if (typeof window !== 'undefined' && window.electronAPI) {
      const resultado = await window.electronAPI.saveFile({
        defaultPath: nomeArquivo,
        filters: [{ name: 'Apresentação PowerPoint', extensions: ['pptx'] }],
        content: base64,
        encoding: 'base64',
      });
      return resultado.canceled ? null : resultado.filePath || nomeArquivo;
    }
    baixarNoNavegador(base64ParaBlob(base64, MIME_PPTX), nomeArquivo);
    return nomeArquivo;
  }

  const file = new File(Paths.document, nomeArquivo);
  if (file.exists) file.delete();
  await file.create();
  await file.write(base64, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: MIME_PPTX,
      dialogTitle: `Apresentação · ${opts.periodoRotulo}`,
    });
  }

  return file.uri;
}
