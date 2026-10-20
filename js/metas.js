/* Metas S/B/MB/E/Máx por perfil (Anexo IV). Módulo puro. */
import {
  OIC01, OIC05, OIC02, OIC06_SEM_JOELHO, OIC03, OIC07,
  OIC04_ROWS, OIC08_ROWS, OIC04_MARCHA_ROWS, OIC08_MARCHA_ROWS,
  M_COLS, F_COLS, tabela1Transicao,
} from './tabelas.js';
import { sec2MMSS, pontosItem, MAXIMOS } from './calculo.js';

/** Pontos mínimos de cada faixa (S, B, MB, E, Máx) por pontuação máxima do item. */
export const LIMIARES = { 10: [2, 4, 7, 9, 10], 30: [6, 12, 21, 27, 30], 50: [10, 20, 35, 45, 50] };
export const FAIXAS = ['S', 'B', 'MB', 'E', 'MAX'];

/** Faixa alcançada por um item isolado, ou null se abaixo do mínimo (S). */
export function faixaItem(pontos, maxPts) {
  let faixa = null;
  LIMIARES[maxPts].forEach((lim, i) => { if (pontos >= lim) faixa = FAIXAS[i]; });
  return faixa;
}

const FORMATOS = {
  cm:     { sentido: '≤', unidade: 'cm',  numero: v => v.toFixed(1).replace('.', ',') },
  rep:    { sentido: '≥', unidade: 'rep', numero: v => String(v) },
  metros: { sentido: '≥', unidade: 'm',   numero: v => String(v) },
  tempo:  { sentido: '≤', unidade: 'min', numero: v => sec2MMSS(v) },
};
const { cm, rep, metros, tempo } = FORMATOS;

function montarLinha(prova, fmt, alvos) {
  const texto = {};
  for (const k of FAIXAS) texto[k] = alvos[k] === null ? '–' : fmt.numero(alvos[k]);
  return { prova, sentido: fmt.sentido, unidade: fmt.unidade, alvos, texto };
}

function linhaMetas(data, isObj, isDesc, col, maxPts, prova, fmt) {
  const items = isObj ? Object.keys(data).map(Number).sort((a, b) => a - b).map(k => [k, data[k]]) : data;
  const alvo = t => {
    const validos = items.filter(i => i[1][col] >= t).map(i => i[0]);
    if (!validos.length) return null;
    return isDesc ? Math.max(...validos) : Math.min(...validos);
  };
  const [tS, tB, tMB, tE, tMAX] = LIMIARES[maxPts];
  return montarLinha(prova, fmt, { S: alvo(tS), B: alvo(tB), MB: alvo(tMB), E: alvo(tE), MAX: alvo(tMAX) });
}

/** Linhas: cintura, flexão, abdominal, corrida, marcha. */
export function metasTACF({ sexo, idade, estatura, transicaoFem }) {
  if (sexo === 'M') {
    return [
      linhaMetas(OIC01, false, true, M_COLS.OIC01(estatura), 30, 'Cintura', cm),
      linhaMetas(OIC02, true, false, M_COLS.OIC02(idade), 10, 'Flexão', rep),
      linhaMetas(OIC03, true, false, M_COLS.OIC03(idade), 10, 'Abdominal', rep),
      linhaMetas(OIC04_ROWS, false, false, M_COLS.OIC04(idade), 50, 'Corrida 12 min', metros),
      linhaMetas(OIC04_MARCHA_ROWS, false, true, M_COLS.MARCH(idade), 50, 'Marcha 4,8 km', tempo),
    ];
  }
  let flexao;
  if (transicaoFem) {
    const t = tabela1Transicao(idade);
    flexao = montarLinha('Flexão c/ joelhos', rep, { S: t.S, B: t.B, MB: t.MB, E: t.E, MAX: t.E });
  } else {
    flexao = linhaMetas(OIC06_SEM_JOELHO, true, false, F_COLS.OIC06(idade), 10, 'Flexão', rep);
  }
  return [
    linhaMetas(OIC05, false, true, F_COLS.OIC05(estatura), 30, 'Cintura', cm),
    flexao,
    linhaMetas(OIC07, true, false, F_COLS.OIC07(idade), 10, 'Abdominal', rep),
    linhaMetas(OIC08_ROWS, false, false, F_COLS.OIC08(idade), 50, 'Corrida 12 min', metros),
    linhaMetas(OIC08_MARCHA_ROWS, false, true, F_COLS.MARCH(idade), 50, 'Marcha 4,8 km', tempo),
  ];
}

function linhaEValor(item, e, metas) {
  switch (item) {
    case 'cintura': return [metas[0], e.cintura];
    case 'flexao': return [metas[1], e.flexao];
    case 'abdominal': return [metas[2], e.abdominal];
    case 'aerobico': return e.aerobicoModo === 'corrida' ? [metas[3], e.corridaM] : [metas[4], e.marchaSeg];
    default: throw new Error(`Item desconhecido: ${item}`);
  }
}

/** Próxima faixa do item e quanto falta para ela (marcha em segundos); null se já no máximo. */
export function proximaFaixa(item, e) {
  const atual = faixaItem(pontosItem(item, e), MAXIMOS[item]);
  if (atual === 'MAX') return null;
  const [linha, valor] = linhaEValor(item, e, metasTACF(e));
  for (let i = atual ? FAIXAS.indexOf(atual) + 1 : 0; i < FAIXAS.length; i++) {
    const alvo = linha.alvos[FAIXAS[i]];
    if (alvo === null) continue;
    const falta = linha.sentido === '≥' ? alvo - valor : valor - alvo;
    if (falta <= 0) continue;
    return { faixa: FAIXAS[i], falta, sentido: linha.sentido, unidade: linha.unidade, minimo: atual === null };
  }
  return null;
}
