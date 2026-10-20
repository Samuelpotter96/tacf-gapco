/* Cálculo do TACF pela NSCA 54-3/2026. Módulo puro: sem DOM, rede ou armazenamento. */
import {
  NORMA, OIC01, OIC05, OIC02, OIC06_SEM_JOELHO, OIC03, OIC07,
  OIC04_ROWS, OIC08_ROWS, OIC04_MARCHA_ROWS, OIC08_MARCHA_ROWS,
  M_COLS, F_COLS, tabela1Transicao,
} from './tabelas.js';

/** Tabela crescente com interpolação linear entre linhas (corrida). */
export function buscarPontoArrayAsc(arr, valor, col) {
  if (valor < arr[0][0]) return 0;
  if (valor >= arr[arr.length - 1][0]) return arr[arr.length - 1][1][col];
  const exata = arr.find(r => r[0] === valor);
  if (exata) return exata[1][col];
  const acima = arr.find(r => r[0] > valor);
  const abaixo = arr.slice().reverse().find(r => r[0] < valor);
  const t = (valor - abaixo[0]) / (acima[0] - abaixo[0]);
  return abaixo[1][col] + t * (acima[1][col] - abaixo[1][col]);
}

/** Tabela por repetições (flexão, abdominal). */
export function buscarPontoObj(obj, valor, col) {
  const chaves = Object.keys(obj).map(Number).sort((a, b) => a - b);
  if (valor < chaves[0]) return 0;
  if (valor >= chaves[chaves.length - 1]) return obj[chaves[chaves.length - 1]][col];
  return obj[valor] ? obj[valor][col] : 0;
}

/**
 * Tabelas decrescentes (cintura, marcha): usa a linha tabelada mais próxima que seja >= valor,
 * ou seja, nunca pontua acima do que a norma garante. Pior que a 1ª linha → 0.
 */
export function buscarPontoDegrauDesc(arr, valor, col) {
  let linha = null;
  for (const r of arr) { if (r[0] >= valor) linha = r; else break; }
  return linha ? linha[1][col] : 0;
}

export function sec2MMSS(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function pontosFlexaoTransicao(flexao, idade) {
  const t = tabela1Transicao(idade);
  if (flexao < t.S) return 0;
  if (flexao < t.B) return 2 + ((flexao - t.S) / (t.B - t.S)) * 2;
  if (flexao < t.MB) return 4 + ((flexao - t.B) / (t.MB - t.B)) * 3;
  if (flexao < t.E) return 7 + ((flexao - t.MB) / (t.E - t.MB)) * 2;
  return 10;
}

/** Pontuação máxima de cada item (OIC). */
export const MAXIMOS = { cintura: 30, flexao: 10, abdominal: 10, aerobico: 50 };

/** Pontos de um único item, a partir do perfil e do valor do próprio item. */
export function pontosItem(item, e) {
  const { sexo, idade, estatura } = e;
  const masc = sexo === 'M';
  switch (item) {
    case 'cintura':
      return masc
        ? buscarPontoDegrauDesc(OIC01, e.cintura, M_COLS.OIC01(estatura))
        : buscarPontoDegrauDesc(OIC05, e.cintura, F_COLS.OIC05(estatura));
    case 'flexao':
      if (masc) return buscarPontoObj(OIC02, e.flexao, M_COLS.OIC02(idade));
      return e.transicaoFem
        ? pontosFlexaoTransicao(e.flexao, idade)
        : buscarPontoObj(OIC06_SEM_JOELHO, e.flexao, F_COLS.OIC06(idade));
    case 'abdominal':
      return masc
        ? buscarPontoObj(OIC03, e.abdominal, M_COLS.OIC03(idade))
        : buscarPontoObj(OIC07, e.abdominal, F_COLS.OIC07(idade));
    case 'aerobico':
      if (e.aerobicoModo === 'corrida') {
        return masc
          ? buscarPontoArrayAsc(OIC04_ROWS, e.corridaM, M_COLS.OIC04(idade))
          : buscarPontoArrayAsc(OIC08_ROWS, e.corridaM, F_COLS.OIC08(idade));
      }
      return masc
        ? buscarPontoDegrauDesc(OIC04_MARCHA_ROWS, e.marchaSeg, M_COLS.MARCH(idade))
        : buscarPontoDegrauDesc(OIC08_MARCHA_ROWS, e.marchaSeg, F_COLS.MARCH(idade));
    default:
      throw new Error(`Item desconhecido: ${item}`);
  }
}

/** Menção (Art. 36): não apto → I; apto → E ≥ 90, MB ≥ 70, B ≥ 40, senão S. */
export function mencaoDe(grau, apto) {
  if (!apto) return 'I';
  if (grau >= 90) return 'E';
  if (grau >= 70) return 'MB';
  if (grau >= 40) return 'B';
  return 'S';
}

/** corridaM já arredondada a 10 m (ver normalizarEntrada). */
export function calcularTACF(e) {
  e = { ...e, transicaoFem: !!e.transicaoFem && e.sexo === 'F' };
  const cin = pontosItem('cintura', e);
  const fle = pontosItem('flexao', e);
  const abd = pontosItem('abdominal', e);
  const aer = pontosItem('aerobico', e);

  const grau = cin + fle + abd + aer;
  // Aptidão (Art. 30, 35 e 36): grau >= 20 E nenhum OIC com zero
  const zeraOIC = cin === 0 || fle === 0 || abd === 0 || aer === 0;
  const apto = !zeraOIC && grau >= 20;

  let motivoInapto = null;
  if (!apto) {
    motivoInapto = zeraOIC
      ? 'Não Apto: desempenho abaixo do mínimo (zero ponto) em um ou mais OIC (Art. 30 e 33).'
      : 'Não Apto: Grau Final inferior a 20,0 pontos (Art. 36, inciso II).';
  }

  let destaque = null;
  if (apto && Math.round(grau * 10) === 1000) destaque = 'maximo';
  else if (apto && grau >= 96) destaque = 'destaque96';

  return {
    norma: NORMA,
    pontos: { cintura: cin, flexao: fle, abdominal: abd, aerobico: aer },
    grau, apto, mencao: mencaoDe(grau, apto), motivoInapto, destaque,
  };
}

/** Corrida de 10 em 10 m, como no campo CORRIDA da norma. */
export function normalizarEntrada(e) {
  return {
    ...e,
    corridaM: e.aerobicoModo === 'corrida' ? Math.round((e.corridaM || 0) / 10) * 10 : undefined,
    marchaSeg: e.aerobicoModo === 'marcha' ? e.marchaSeg : undefined,
  };
}

export const MENCOES = {
  E:  { rotulo: 'Excelente',      sigla: 'E',  cor: '#64B5F6' },
  MB: { rotulo: 'Muito Bom',      sigla: 'MB', cor: '#81C784' },
  B:  { rotulo: 'Bom',            sigla: 'B',  cor: '#C5E1A5' },
  S:  { rotulo: 'Satisfatório',   sigla: 'S',  cor: '#FFD54F' },
  I:  { rotulo: 'Insatisfatório', sigla: 'I',  cor: '#EF5350' },
};

const LIMIAR_MENCAO = [['S', 20], ['B', 40], ['MB', 70], ['E', 90]];

/** Próxima menção e quantos pontos faltam (arredondado para cima a 0,1); null se não se aplica. */
export function proximaMencao(r) {
  if (!r.apto && Object.values(r.pontos).some(p => p === 0)) return null;
  const proxima = LIMIAR_MENCAO.find(([, limiar]) => r.grau < limiar);
  if (!proxima) return null;
  const [mencao, limiar] = proxima;
  const centesimos = Math.round((limiar - r.grau) * 100);
  return { mencao, limiar, falta: Math.ceil(centesimos / 10) / 10 };
}
