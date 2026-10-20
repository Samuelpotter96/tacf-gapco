/* Liga o formulário do index.html aos módulos de cálculo e metas. */
import { calcularTACF, normalizarEntrada, pontosItem, sec2MMSS, MENCOES, MAXIMOS, proximaMencao } from './calculo.js';
import { metasTACF, proximaFaixa, faixaItem } from './metas.js';

const $ = id => document.getElementById(id);
const fmt = v => v.toFixed(1).replace('.', ',');

const LIMITES = {
  idade:     [18, 75, true,  'Idade: de 18 a 75 anos.'],
  estatura:  [140, 220, false, 'Estatura: de 140 a 220 cm.'],
  cintura:   [50, 150, false, 'Cintura: de 50 a 150 cm.'],
  flexao:    [0, 150, true,  'Flexão: de 0 a 150 repetições.'],
  abdominal: [0, 150, true,  'Abdominal: de 0 a 150 repetições.'],
  corridaM:  [1, 5000, true, 'Corrida: de 1 a 5000 metros.'],
  marchaSeg: [600, 7200, true, 'Marcha: de 10:00 a 120:00.'],
  segundos:  [0, 59, true,   'Segundos da marcha: de 0 a 59.'],
  fc:        [30, 220, true, 'FC de repouso: de 30 a 220 bpm.'],
};
function erroCampo(campo, v) {
  const [min, max, inteiro, msg] = LIMITES[campo];
  return Number.isFinite(v) && v >= min && v <= max && (!inteiro || Number.isInteger(v)) ? null : msg;
}

const ROTULO_FAIXA = { S: 'Satisfatório', B: 'Bom', MB: 'Muito Bom', E: 'Excelente', MAX: 'Máximo' };
const CLASSE_FAIXA = { S: 'c-s', B: 'c-b', MB: 'c-mb', E: 'c-e', MAX: 'c-max' };
const INPUT = { idade: 'idade', estatura: 'estatura', cintura: 'cintura', flexao: 'flexao', abdominal: 'abdominal', corridaM: 'corrida', marchaSeg: 'marcha-min', segundos: 'marcha-seg', fc: 'fc' };

let modo = 'corrida';
let joelhos = false;

const num = id => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };

function lerEntrada() {
  const sexo = $('sexo').value;
  const e = {
    sexo, idade: num('idade'), estatura: num('estatura'),
    transicaoFem: joelhos && sexo === 'F',
    cintura: num('cintura'), flexao: num('flexao'), abdominal: num('abdominal'),
    aerobicoModo: modo,
  };
  if (modo === 'corrida') e.corridaM = num('corrida') || 0;
  else e.marchaSeg = (num('marcha-min') || 0) * 60 + (num('marcha-seg') || 0);
  return normalizarEntrada(e);
}

const perfilOk = e => !erroCampo('idade', e.idade) && !erroCampo('estatura', e.estatura);

function erroItem(item, e) {
  if (item !== 'aerobico') return erroCampo(item, e[item]);
  if (modo === 'corrida') return erroCampo('corridaM', e.corridaM);
  const s = $('marcha-seg').value.trim();
  return (s !== '' && erroCampo('segundos', Number(s))) || erroCampo('marchaSeg', e.marchaSeg);
}

function preenchido(item) {
  const ids = item !== 'aerobico' ? [item] : modo === 'corrida' ? ['corrida'] : ['marcha-min', 'marcha-seg'];
  return ids.some(id => $(id).value.trim() !== '');
}

function textoFalta(p) {
  if (!p) return '';
  let quanto;
  if (p.unidade === 'min') quanto = sec2MMSS(p.falta);
  else if (p.unidade === 'cm') quanto = `${fmt(p.falta)} cm`;
  else quanto = `${p.falta} ${p.unidade}`;
  const verbo = p.sentido === '≤' ? 'Reduzir' : p.falta === 1 ? 'Falta' : 'Faltam';
  return `${verbo} ${quanto} para ${p.faixa === 'MAX' ? 'o Máximo' : ROTULO_FAIXA[p.faixa]}` + (p.minimo ? ' (mínimo para APTO)' : '');
}

function atualizarPrevias() {
  const e = lerEntrada();
  const ok = perfilOk(e);
  for (const item of ['cintura', 'flexao', 'abdominal', 'aerobico']) {
    const el = $('previa-' + item), falta = $('falta-' + item);
    falta.textContent = '';
    if (!preenchido(item)) { el.textContent = ''; el.className = 'previa'; continue; }
    const erro = erroItem(item, e);
    if (erro) { el.textContent = erro; el.className = 'previa p-zero'; continue; }
    if (!ok) { el.textContent = 'Informe idade e estatura para ver os pontos'; el.className = 'previa p-pendente'; continue; }
    const pts = pontosItem(item, e);
    const faixa = faixaItem(pts, MAXIMOS[item]);
    el.textContent = `→ ${fmt(pts)} de ${MAXIMOS[item]} pts · ${faixa ? ROTULO_FAIXA[faixa] : 'abaixo do mínimo'}`;
    el.className = 'previa ' + (faixa ? CLASSE_FAIXA[faixa] : 'p-zero');
    falta.textContent = textoFalta(proximaFaixa(item, e));
  }
}

function atualizarFC() {
  const el = $('previa-fc');
  const fc = num('fc');
  if (Number.isNaN(fc)) { el.textContent = ''; return; }
  const erro = erroCampo('fc', fc);
  if (erro) { el.textContent = erro; el.className = 'previa p-zero'; return; }
  el.textContent = fc > 100 ? `→ ${fc} bpm · acima de 100: procurar o médico antes dos testes (Art. 24)` : `→ ${fc} bpm · dentro do limite (não pontua)`;
  el.className = 'previa ' + (fc > 100 ? 'p-zero' : 'p-ok');
}

function atualizarPerfil() {
  const sexo = $('sexo').value;
  $('grupo-joelhos').hidden = sexo !== 'F';
  $('nota-joelhos').hidden = !(sexo === 'F' && joelhos);
  atualizarPrevias();

  const e = lerEntrada();
  if (!perfilOk(e)) { $('card-metas').hidden = true; return; }
  $('card-metas').hidden = false;
  $('metas-desc').textContent = `${sexo === 'M' ? 'Masculino' : 'Feminino'} · ${e.idade} anos · ${String(e.estatura).replace('.', ',')} cm — valor mínimo (≥) ou máximo (≤) para cada menção.`;
  $('metas-corpo').innerHTML = metasTACF(e).map(l => `<tr>
      <td>${l.prova}<small>${l.sentido} ${l.unidade}</small></td>
      <td class="c-s">${l.texto.S}</td><td class="c-b">${l.texto.B}</td><td class="c-mb">${l.texto.MB}</td>
      <td class="c-e">${l.texto.E}</td><td class="c-max">${l.texto.MAX}</td></tr>`).join('');
}

function setModo(m) {
  modo = m;
  for (const [id, v] of [['btn-corrida', 'corrida'], ['btn-marcha', 'marcha']]) {
    $(id).classList.toggle('ativo', m === v);
    $(id).setAttribute('aria-pressed', String(m === v));
  }
  $('box-corrida').hidden = m !== 'corrida';
  $('box-marcha').hidden = m !== 'marcha';
  atualizarPrevias();
}

function setJoelhos(v) {
  joelhos = v;
  $('btn-padrao').classList.toggle('ativo', !v);
  $('btn-padrao').setAttribute('aria-pressed', String(!v));
  $('btn-joelhos').classList.toggle('ativo', v);
  $('btn-joelhos').setAttribute('aria-pressed', String(v));
  atualizarPerfil();
}

function mostrarAlerta(texto) {
  $('alerta').textContent = texto;
  $('alerta').hidden = !texto;
}

function calcular() {
  const e = lerEntrada();
  for (const id of Object.values(INPUT)) $(id).removeAttribute('aria-invalid');

  const vazios = [];
  const erros = [];
  const conferir = (campo, v, nome) => {
    if (Number.isNaN(v) || v === 0 && (campo === 'corridaM' || campo === 'marchaSeg')) { vazios.push(nome); $(INPUT[campo]).setAttribute('aria-invalid', 'true'); return; }
    const erro = erroCampo(campo, v);
    if (erro) { erros.push(erro); $(INPUT[campo]).setAttribute('aria-invalid', 'true'); }
  };
  conferir('idade', e.idade, 'idade');
  conferir('estatura', e.estatura, 'estatura');
  conferir('cintura', e.cintura, 'cintura');
  conferir('flexao', e.flexao, 'flexão');
  conferir('abdominal', e.abdominal, 'abdominal');
  if (modo === 'corrida') conferir('corridaM', e.corridaM, 'corrida');
  else {
    const s = $('marcha-seg').value.trim();
    if (s !== '' && erroCampo('segundos', Number(s))) { erros.push(LIMITES.segundos[3]); $('marcha-seg').setAttribute('aria-invalid', 'true'); }
    conferir('marchaSeg', e.marchaSeg, 'marcha');
  }

  if (vazios.length || erros.length) {
    $('resultado').hidden = true;
    mostrarAlerta([vazios.length ? `Preencha: ${vazios.join(', ')}.` : '', ...erros].filter(Boolean).join(' '));
    return;
  }
  mostrarAlerta('');

  const r = calcularTACF(e);
  $('resultado').hidden = false;
  $('res-info').textContent = `${e.sexo === 'M' ? 'Masculino' : 'Feminino'}${e.transicaoFem ? ' (transição Art. 109)' : ''} · ${e.idade} anos · ${String(e.estatura).replace('.', ',')} cm`;
  $('res-grau').textContent = fmt(r.grau);
  $('res-apto').textContent = r.apto ? '✓ APTO' : '✗ NÃO APTO';
  $('res-apto').className = 'badge ' + (r.apto ? 'apto' : 'inapto');
  const m = MENCOES[r.mencao];
  $('res-mencao').textContent = `Menção: ${m.rotulo} (${m.sigla})`;
  $('res-mencao').style.color = m.cor;

  $('res-destaque').hidden = !r.destaque;
  $('res-destaque').textContent = r.destaque === 'maximo' ? 'Pontuação máxima: 100 pontos!' : 'Destaque: grau final de 96 pontos ou mais.';
  $('res-motivo').hidden = !r.motivoInapto;
  $('res-motivo').textContent = r.motivoInapto || '';
  const prox = proximaMencao(r);
  $('res-proxima').hidden = !prox;
  if (prox) $('res-proxima').textContent = `${prox.falta < 2 ? 'Falta' : 'Faltam'} ${fmt(prox.falta)} ${prox.falta < 2 ? 'ponto' : 'pontos'} para ${MENCOES[prox.mencao].rotulo} (${prox.limiar}).`;

  const masc = e.sexo === 'M';
  const itens = [
    [masc ? 'OIC 01 · Cintura' : 'OIC 05 · Cintura', `${String(e.cintura).replace('.', ',')} cm`, r.pontos.cintura, 30],
    [masc ? 'OIC 02 · Flexão' : 'OIC 06 · Flexão', `${e.flexao} rep${e.transicaoFem ? ' (joelhos)' : ''}`, r.pontos.flexao, 10],
    [masc ? 'OIC 03 · Abdominal' : 'OIC 07 · Abdominal', `${e.abdominal} rep`, r.pontos.abdominal, 10],
    [masc ? 'OIC 04 · Aeróbico' : 'OIC 08 · Aeróbico', modo === 'corrida' ? `${e.corridaM} m` : `${sec2MMSS(e.marchaSeg)} marcha`, r.pontos.aerobico, 50],
  ];
  $('res-itens').innerHTML = itens.map(([nome, val, p, mx]) => `
    <div class="item${p === 0 ? ' zerado' : ''}">
      <div class="item-nome">${nome}</div>
      <div class="item-pts" style="color:${p === 0 ? 'var(--vermelho)' : '#fff'}">${fmt(p)} <small>/ ${mx}</small></div>
      <div class="item-val">${val}</div>
      <div class="barra"><i data-w="${Math.min(p / mx * 100, 100)}"></i></div>
    </div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.barra i').forEach(b => { b.style.width = b.dataset.w + '%'; });
  }));

  $('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpar() {
  document.querySelectorAll('input').forEach(i => { i.value = ''; i.removeAttribute('aria-invalid'); });
  mostrarAlerta('');
  $('resultado').hidden = true;
  $('previa-fc').textContent = '';
  setJoelhos(false);
  setModo('corrida');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('sexo').addEventListener('change', atualizarPerfil);
$('idade').addEventListener('input', atualizarPerfil);
$('estatura').addEventListener('input', atualizarPerfil);
$('fc').addEventListener('input', atualizarFC);
for (const id of ['cintura', 'flexao', 'abdominal', 'corrida', 'marcha-min', 'marcha-seg']) {
  $(id).addEventListener('input', () => { $(id).removeAttribute('aria-invalid'); atualizarPrevias(); });
}
$('btn-corrida').addEventListener('click', () => setModo('corrida'));
$('btn-marcha').addEventListener('click', () => setModo('marcha'));
$('btn-padrao').addEventListener('click', () => setJoelhos(false));
$('btn-joelhos').addEventListener('click', () => setJoelhos(true));
$('btn-calcular').addEventListener('click', calcular);
$('btn-limpar').addEventListener('click', limpar);
document.querySelectorAll('input').forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter') calcular(); }));
