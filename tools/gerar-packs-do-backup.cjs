/*
 * gerar-packs-do-backup.cjs — Monta pacotes por gênero a partir de um backup do Cifra-Dog.
 * USO:  node tools/gerar-packs-do-backup.cjs <backup.json> [pasta-de-saida]
 *   (saída padrão: cifradog-pacotes/pacotes; depois rode ferramentas/gerar-catalogo.cjs)
 *
 * Regras (AJUSTAR em LIMITES): só gêneros com pelo menos MIN músicas viram pack; cada pack leva
 * no máximo "teto" músicas escolhidas ao acaso (sorteio com semente fixa: rodar de novo dá o mesmo resultado).
 * O gênero vem do catálogo do app (js/catalogo.js), igual à tela Buscar.
 */
'use strict';
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
global.window = global;
global.UI = { normal: s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() };
require(path.join(RAIZ, 'v2/js/cifra-motor.js'));
const CM = global.CifraMotor || module.exports;
require(path.join(RAIZ, 'v2/js/catalogo.js'));
const Catalogo = global.Catalogo;

// AJUSTAR: mínimo de músicas do gênero para existir um pack (1 = todo gênero tem pack, para ir crescendo), e quantas entram em cada um.
const MIN = 1;
const TETO = { rock: 30, pop: 12, mpb: 10, default: 8 };
const AUTOR_PACK = 'Rafael Carneiro (Rolfis)';
const DESCRICAO = {
    rock: 'Rock nacional e internacional para tocar em roda ou no palco. Seleção do repertório do Rolfis.',
    pop: 'Pop nacional e internacional, de hits recentes a clássicos. Seleção do repertório do Rolfis.',
    mpb: 'MPB para violão e voz. Seleção do repertório do Rolfis.',
    reggae: 'Reggae nacional e clássicos para violão. Seleção do repertório do Rolfis.',
};

const slug = s => UI.normal(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
let semente = 20261124;
const alea = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
const embaralhar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const TIPO_SECAO = [[/^intro/, 'intro'], [/^pre/, 'pre-refrao'], [/refrao|refrain/, 'refrao'], [/^ponte/, 'ponte'], [/solo|riff/, 'solo'], [/interludio|passagem/, 'interludio'], [/^final|^outro/, 'final']];
const tipoSecao = nome => { const n = UI.normal(nome).replace(/[^a-z ]/g, ''); const t = TIPO_SECAO.find(([re]) => re.test(n)); return t ? t[1] : 'verso'; };
const limpa = t => {   // "F6(9)" é acorde; "(G)" vira "G"; "A7(4/9)" (que o app não conhece) vira "A7"
    if (CM.ehAcorde(t)) return t;
    const x = t.replace(/^[(|]+|[)|]+$/g, '');
    if (CM.ehAcorde(x) && (x.match(/\(/g) || []).length === (x.match(/\)/g) || []).length) return x;
    const base = x.replace(/\(.*$/, '');
    return CM.ehAcorde(base) ? base : x;
};
const ehAc = t => { const x = limpa(t); return !!x && CM.ehAcorde(x); };

/** Texto "acordes em cima da letra" -> secoes com linhas ChordPro ("[G]Ciranda"). */
function converter(cifra) {
    const L = CM.normalizarTexto(cifra).split('\n');
    const secoes = []; let atual = null;
    const abrir = nome => { atual = { tipo: tipoSecao(nome), nome, linhas: [] }; secoes.push(atual); };
    const tokens = linha => [...linha.matchAll(/\S+/g)].map(m => ({ t: m[0], i: m.index }));
    for (let k = 0; k < L.length; k++) {
        const linha = L[k].replace(/\s+$/, '');
        const tp = CM.tipoLinha(linha);
        if (tp.tipo === 'vazia') continue;
        if (tp.tipo === 'secao') {
            abrir(tp.nome);
            const ac = tokens(tp.resto || '').filter(x => ehAc(x.t));
            if (ac.length) atual.linhas.push({ tipo: 'acordes', texto: ac.map(x => '[' + limpa(x.t) + ']').join(' ') });
            else if ((tp.resto || '').trim()) atual.linhas.push({ texto: tp.resto.trim() });
            continue;
        }
        if (!atual) abrir('Música');
        if (tp.tipo === 'acordes') {
            const ac = tokens(linha);
            let j = k + 1; while (j < L.length && !L[j].trim()) j++;
            const prox = j < L.length && j === k + 1 ? L[j].replace(/\s+$/, '') : null;   // letra logo abaixo (sem linha em branco)
            if (prox !== null && CM.tipoLinha(prox).tipo === 'letra') {
                let letra = prox, extra = 0;
                for (const x of ac) {
                    if (!ehAc(x.t)) continue;
                    const nome = limpa(x.t);
                    const col = x.i + extra;
                    if (col > letra.length) letra += ' '.repeat(col - letra.length);
                    letra = letra.slice(0, col) + '[' + nome + ']' + letra.slice(col);
                    extra += nome.length + 2;
                }
                atual.linhas.push({ texto: letra.replace(/\s+$/, '') }); k = j; continue;
            }
            const so = ac.filter(x => ehAc(x.t)).map(x => '[' + limpa(x.t) + ']');
            const resto = ac.filter(x => !ehAc(x.t) && !/^[|()\-–—]+$/.test(x.t)).map(x => x.t);
            atual.linhas.push({ tipo: 'acordes', texto: so.join(' ') });
            if (resto.length) atual.linhas.push({ tipo: 'obs', texto: resto.join(' ') });
            continue;
        }
        atual.linhas.push({ texto: linha });     // letra ou tablatura
    }
    return secoes.filter(s => s.linhas.length).map(s => ({ tipo: s.tipo, nome: s.nome, linhas: s.linhas }));
}

function main() {
    const [, , entrada, saida = path.join(RAIZ, 'cifradog-pacotes/pacotes')] = process.argv;
    if (!entrada) { console.error('Uso: node tools/gerar-packs-do-backup.cjs <backup.json> [pasta]'); process.exit(1); }
    const bk = JSON.parse(fs.readFileSync(entrada, 'utf8'));
    const porGenero = {};
    Catalogo.generos.forEach(g => porGenero[g.id] = []);
    const todas = bk.musicas.map(m => ({ m, g: Catalogo.generosDe(m).filter(x => porGenero[x]) })).filter(x => x.g.length);
    todas.forEach(x => x.g.forEach(g => porGenero[g].push(x.m.id)));
    // Música em dois gêneros (ex.: Cazuza em rock e MPB) fica só no gênero com menos músicas.
    const dono = new Map();
    todas.forEach(x => dono.set(x.m.id, x.g.slice().sort((a, b) => porGenero[a].length - porGenero[b].length)[0]));
    const relatorio = [];
    fs.mkdirSync(saida, { recursive: true });
    for (const g of Catalogo.generos) {
        // Cifra vazia (só o título, esperando ser colada) não entra: precisa ter acordes de verdade.
        const comCifra = m => converter(m.cifra || '').some(s => s.linhas.some(l => /\[[^\]]+\]/.test(l.texto)));
        const donas = todas.filter(x => dono.get(x.m.id) === g.id).map(x => x.m).filter(comCifra);
        if (donas.length < MIN) { relatorio.push(g.nome + ': ' + donas.length + ' música(s) — sem pack (mínimo ' + MIN + ')'); continue; }
        const teto = Math.min(TETO[g.id] || TETO.default, donas.length);
        const escolhidas = embaralhar(donas).slice(0, teto).sort((a, b) => (a.artista + a.titulo).localeCompare(b.artista + b.titulo, 'pt'));
        const usados = new Set();
        const musicas = escolhidas.map(m => {
            let id = slug(m.titulo + '-' + m.artista).slice(0, 80) || 'musica'; for (let n = 2; usados.has(id); n++) id = id + '-' + n; usados.add(id);
            const secoes = converter(m.cifra || '');
            const o = { id, titulo: m.titulo, artista: m.artista, tom: m.tom, genero: g.id, idioma: 'pt-BR' };
            if (m.capo) o.capo = m.capo; if (m.bpm) o.bpm = m.bpm; if (m.compasso) o.compasso = m.compasso;
            o.licenca = { tipo: 'transcricao', fonte: 'Cifra transcrita por ' + AUTOR_PACK, autor: m.artista,
                atribuicao: 'Letra e música de ' + m.artista + '. Cifra transcrita por ' + AUTOR_PACK + '.', verificadoEm: new Date().toISOString().slice(0, 10) };
            o.secoes = secoes;
            return o;
        });
        const pacote = { formato: 'cifradog.pacote', versao: 1,
            pacote: { id: 'pack-' + g.id, nome: g.nome, descricao: DESCRICAO[g.id] || ('Seleção de ' + g.nome + ' do repertório do Rolfis.'), autor: AUTOR_PACK, revisao: 1,
                atualizadoEm: new Date().toISOString().slice(0, 10), idioma: 'pt-BR', tags: [g.id] },
            musicas };
        fs.writeFileSync(path.join(saida, 'pack-' + g.id + '.json'), JSON.stringify(pacote, null, 1) + '\n');
        relatorio.push(g.nome + ': ' + musicas.length + ' de ' + donas.length + ' → pack-' + g.id + '.json');
    }
    console.log(relatorio.join('\n'));
}
main();
