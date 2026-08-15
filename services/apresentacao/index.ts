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

export async function gerarECompartilharApresentacao(opts: GerarDadosOpts): Promise<string> {
  const dados = await montarDadosApresentacao(opts);
  const base64 = await gerarPptxApresentacao(dados);

  const nomeArquivo = `apresentacao_${slugify(opts.organizacao)}_${opts.dataInicio}_a_${opts.dataFim}.pptx`;
  const file = new File(Paths.document, nomeArquivo);
  if (file.exists) file.delete();
  await file.create();
  await file.write(base64, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      dialogTitle: `Apresentação · ${opts.periodoRotulo}`,
    });
  }

  return file.uri;
}
