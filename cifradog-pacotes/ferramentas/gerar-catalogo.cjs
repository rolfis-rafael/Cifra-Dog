/*
 * gerar-catalogo.cjs — Gera o catalogo.json a partir da pasta pacotes/.
 * ---------------------------------------------------------------------------
 * USO (na pasta do repositório):   node ferramentas/gerar-catalogo.cjs
 *
 * O QUE FAZ
 *   1. Lê cada pacotes/*.json e confere as regras que o app exige
 *      (formato, ids, licença livre com fonte, crédito em CC BY...).
 *   2. Calcula o sha256 e o tamanho de cada pacote (o app confere o sha256
 *      ao baixar, para não instalar um arquivo corrompido).
 *   3. Escreve o catalogo.json na raiz.
 *   Se algum pacote tiver erro, NÃO escreve nada e mostra o problema.
 *
 * Não precisa instalar nada: só Node.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const PASTA = path.join(RAIZ, 'pacotes');
const RE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RE_TOM = /^[A-G][#b]?m?$/;
const LIVRES = ['dominio-publico', 'cc0', 'cc-by', 'cc-by-sa', 'autorizado', 'transcricao'];

/** Confere um pacote. Devolve a lista de problemas (vazia = tudo certo). */
function conferir(p, arq) {
    const erros = [];
    const e = (msg) => erros.push(arq + ': ' + msg);
    if (p.formato !== 'cifradog.pacote' || p.versao !== 1) { e('formato/versão inválidos'); return erros; }
    const info = p.pacote || {};
    if (!RE_ID.test(info.id || '')) e('pacote.id inválido');
    if (path.basename(arq, '.json') !== info.id) e('o nome do arquivo deve ser igual ao pacote.id (' + info.id + '.json)');
    if (!info.nome) e('pacote.nome vazio');
    if (!Number.isInteger(info.revisao) || info.revisao < 1) e('pacote.revisao deve ser inteiro >= 1');
    if (!Array.isArray(p.musicas) || !p.musicas.length) { e('sem músicas'); return erros; }
    const ids = new Set();
    p.musicas.forEach((m, i) => {
        const q = 'música ' + (i + 1) + (m && m.titulo ? ' (' + m.titulo + ')' : '');
        if (!RE_ID.test(m.id || '')) e(q + ': id inválido');
        if (ids.has(m.id)) e(q + ': id repetido');
        ids.add(m.id);
        if (!m.titulo || !m.artista) e(q + ': falta título ou artista');
        if (!RE_TOM.test(m.tom || '')) e(q + ': tom inválido (use G, Em, F#m, Bb...)');
        const lic = m.licenca || {};
        if (!LIVRES.includes(lic.tipo)) e(q + ': licença precisa ser livre (' + LIVRES.join(', ') + ')');
        if (!lic.fonte) e(q + ': falta licenca.fonte');
        if ((lic.tipo === 'cc-by' || lic.tipo === 'cc-by-sa') && !lic.atribuicao) e(q + ': CC BY exige licenca.atribuicao');
        if (!Array.isArray(m.secoes) || !m.secoes.length) e(q + ': sem seções');
        (m.secoes || []).forEach((s, k) => {
            if (!Array.isArray(s.linhas) || !s.linhas.length) e(q + ': seção ' + (k + 1) + ' sem linhas');
        });
    });
    return erros;
}

function main() {
    const arquivos = fs.readdirSync(PASTA).filter(f => f.endsWith('.json')).sort();
    const entradas = [], erros = [];
    for (const arq of arquivos) {
        const bruto = fs.readFileSync(path.join(PASTA, arq));
        let p;
        try { p = JSON.parse(bruto.toString('utf8')); } catch (x) { erros.push(arq + ': JSON inválido (' + x.message + ')'); continue; }
        const problemas = conferir(p, arq);
        if (problemas.length) { erros.push(...problemas); continue; }
        const tipos = [...new Set(p.musicas.map(m => m.licenca.tipo))];
        entradas.push({
            id: p.pacote.id,
            nome: p.pacote.nome,
            descricao: p.pacote.descricao || '',
            revisao: p.pacote.revisao,
            arquivo: 'pacotes/' + arq,
            qtdMusicas: p.musicas.length,
            tamanhoBytes: bruto.length,
            sha256: crypto.createHash('sha256').update(bruto).digest('hex'),
            // Pacote misto mostra a licença mais restritiva.
            licenca: ['transcricao', 'cc-by-sa', 'cc-by', 'autorizado', 'cc0', 'dominio-publico'].find(t => tipos.includes(t)),
            tags: p.pacote.tags || [],
        });
    }
    if (erros.length) {
        console.error('Catálogo NÃO gerado. Corrija:\n - ' + erros.join('\n - '));
        process.exit(1);
    }
    const catalogo = { formato: 'cifradog.catalogo', versao: 1, atualizadoEm: new Date().toISOString(), pacotes: entradas };
    fs.writeFileSync(path.join(RAIZ, 'catalogo.json'), JSON.stringify(catalogo, null, 2) + '\n');
    console.log('catalogo.json gerado: ' + entradas.length + ' pacote(s), ' + entradas.reduce((n, x) => n + x.qtdMusicas, 0) + ' música(s).');
}

main();
