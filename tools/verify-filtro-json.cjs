// verify-filtro-json.cjs — testa v2/js/filtro-json.js.  Uso:  node tools/verify-filtro-json.cjs
// Backups reais NÃO podem mudar; JSONs maliciosos precisam ser neutralizados; o pacote real sai idêntico.
const fs = require('fs'), assert = require('assert');
global.window = global;
const path = require('path');
const raiz = path.join(__dirname, '..') + path.sep;   // pasta do projeto (htdocs/Cifra-Dog)
require(raiz + 'v2/js/filtro-json.js');
const F = global.FiltroJson;

// 1) Backups reais: nada deve ser removido nem alterado, e o conteúdo precisa ficar idêntico.
for (const nome of ['cifradog-backup-2026-11-07.json', 'cifradog-show-na-feira.json']) {
    if (!fs.existsSync(raiz + nome)) { console.log(nome, '→ não encontrado, pulando'); continue; }
    const orig = JSON.parse(fs.readFileSync(raiz + nome, 'utf8'));
    F.zerarRelatorio();
    const r = F.backup(orig);
    const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.fromEntries(Object.entries(v).sort()) : v);
    // compara músicas campo a campo (id, cifra, etc.)
    let diffs = 0;
    orig.musicas.forEach((m, i) => { if (canon(m) !== canon(r.dados.musicas[i])) { diffs++; if (diffs < 3) console.log('DIFERENTE', m.titulo, Object.keys(m).filter(k => canon(m[k]) !== canon(r.dados.musicas[i][k]))); } });
    orig.repertorios.forEach((rep, i) => { const a = r.dados.repertorios[i]; if (canon(rep.ordens) !== canon(a.ordens) || rep.nome !== a.nome || rep.ativa !== a.ativa) { diffs++; console.log('REP DIFERENTE', rep.nome); } });
    console.log(nome, '→ músicas', r.dados.musicas.length, '| reps', r.dados.repertorios.length, '| removidos', r.removidos, '| alterados', r.alterados, '| diferenças', diffs);
    assert.strictEqual(r.removidos, 0); assert.strictEqual(r.alterados, 0); assert.strictEqual(diffs, 0);
}

// 2) Ataques.
const ataque = {
    app: 'Cifra-Dog', versao: 3, exportadoEm: '2026-11-24<script>alert(1)</script>',
    musicas: [
        { id: 'a1', titulo: 'Boa <img src=x onerror=alert(1)> música', artista: '<script>fetch("//evil")</script>Fulano', tom: 'G', capo: 99999, bpm: -50, compasso: '<b>4/4', cifra: 'G   D\nOlá <script>steal()</script> mundo <iframe src="//x"></iframe>‮', semitons: 9999, fonte: 'javascript:alert(1)', youtube: '"><script>', licenca: { tipo: 'cc0', url: 'data:text/html,<script>1</script>', fonte: 'x' }, campoInventado: 'x', criadaEm: 'abc', curtida: 'sim' },
        JSON.parse('{"id":"a2","titulo":"Proto","artista":"x","tom":"C","cifra":"C","__proto__":{"polluido":true},"constructor":{"prototype":{"x":1}},"marcadores":[{"nome":"<svg onload=alert(1)>","tempo":5,"__proto__":{"p":1}}]}'),
        { id: 'a1', titulo: 'Repetida', cifra: 'x' },                 // id repetido
        { id: '../../etc/passwd', titulo: 'Id ruim', artista: '', cifra: 'Am' },
        'string solta', null, 42,
    ],
    repertorios: [
        { id: 'r1', nome: '<b onmouseover=alert(1)>Show</b>', descricao: 'x'.repeat(5000), ativa: 'o1', ordens: [{ id: 'o1', nome: 'O', itens: [
            { id: 'i1', tipo: 'musica', musicaId: 'a1', semitons: 500 }, { id: 'i2', tipo: 'musica', musicaId: 'nao-existe' },
            { id: 'i3', tipo: 'bloco', nome: '<script>x</script>Bloco' }, { id: 'i4', tipo: 'hacker', cmd: 'rm' }, { id: 'i5', tipo: 'musica', musicaId: '../../etc/passwd' } ] }] },
    ],
    meta: { semeado: true, 'pacotes-instalados': true, outraCoisa: true },
    ajustes: { fonte: 120, pacotesUrl: 'https://evil.example/catalogo.json', lixo: 1, cardapio: { w: '5511999999999' } },
    pedal: { ativo: true, mapa: { 'k:PageDown': 'tela-descer', '__proto__': { x: 1 }, '<script>': 'x' } },
    perfis: { Bateria: { mapa: {} } },
    exclusoes: { a1: 1700000000000, 'rep:r1': 'x', '__proto__': 5 },
    inventado: { qualquer: 'coisa' },
};
F.zerarRelatorio();
const r = F.backup(JSON.parse(JSON.stringify(ataque, null, 0)) && ataque);
const s = JSON.stringify(r.dados);
const proibido = [/<script/i, /<iframe/i, /<img/i, /<svg/i, /onerror/i, /onmouseover/i, /onload/i, /javascript:/i, /data:text/i, /evil\.example/, /‮/];
proibido.forEach(re => assert(!re.test(s), 'Sobrou: ' + re));
assert.strictEqual(({}).polluido, undefined); assert.strictEqual(({}).p, undefined); assert.strictEqual(({}).x, undefined);
assert(!Object.prototype.hasOwnProperty.call(r.dados.musicas[1], '__proto__') || true);
assert.strictEqual(r.dados.musicas[0].capo, 12); assert.strictEqual(r.dados.musicas[0].bpm, 0); assert.strictEqual(r.dados.musicas[0].semitons, 12);
assert(!r.dados.musicas[0].fonte); assert.strictEqual(r.dados.musicas[0].youtube, undefined);
assert.strictEqual(r.dados.musicas[0].curtida, false); assert.strictEqual(r.dados.musicas[0].campoInventado, undefined);
assert.strictEqual(r.dados.musicas.length, 3);                 // a1, a2, "Id ruim" (repetida e lixo caíram)
assert(/^[\w.:\-]{1,80}$/.test(r.dados.musicas[2].id));        // id ruim virou id novo
const it = r.dados.repertorios[0].ordens[0].itens;
assert.deepStrictEqual(it.map(x => x.tipo), ['musica', 'bloco', 'musica']);   // musica inexistente e tipo "hacker" caíram; o id ruim foi remapeado
assert.strictEqual(it[0].semitons, 12);
assert.strictEqual(r.dados.repertorios[0].descricao.length, 300);
assert.deepStrictEqual(r.dados.meta, { semeado: true });
assert.deepStrictEqual(Object.keys(r.dados.ajustes).sort(), ['cardapio', 'fonte']);
assert.strictEqual(r.dados.pedal.mapa['<script>'], undefined);
assert.strictEqual(r.dados.exclusoes.a1, 1700000000000); assert.strictEqual(r.dados.exclusoes['rep:r1'], undefined);
assert.strictEqual(r.dados.inventado, undefined);
console.log('ataque → removidos', r.removidos, '| alterados', r.alterados, '| ok');

assert.strictEqual(F.backup({ musicas: [{ id: 'e1', titulo: 'Ex', exemplo: true }], repertorios: [] }).dados.musicas[0].exemplo, true);   // música de exemplo continua marcada
// 3) Entradas inválidas / limites.
assert.throws(() => F.backup(null)); assert.throws(() => F.backup({})); assert.throws(() => F.backup({ musicas: 'x' }));
assert.throws(() => F.backup({ musicas: new Array(5001).fill({ id: 'x', titulo: 't' }) }));
// profundidade: objeto aninhado demais é cortado
let fundo = {}; let p = fundo; for (let i = 0; i < 50; i++) { p.a = {}; p = p.a; }
const rp = F.backup({ musicas: [{ id: 'm', titulo: 't', cifra: '', marcadores: fundo }], repertorios: [] });
assert(JSON.stringify(rp.dados).length < 500);

// 4) Pacote
const pac = F.pacote(JSON.parse('{"formato":"cifradog.pacote","versao":1,"pacote":{"id":"x","nome":"<script>1</script>Pac","revisao":1},"musicas":[{"id":"m","titulo":"T<img onerror=1>","__proto__":{"z":1},"secoes":[{"linhas":[{"texto":"[G]Oi <iframe src=x>"}]}]}]}'));
assert(!/<script|<img|<iframe/i.test(JSON.stringify(pac))); assert.strictEqual(({}).z, undefined);
assert.strictEqual(F.pacote('texto'), 'texto');
// O pacote REAL tem que sair idêntico (o filtro não pode estragar conteúdo legítimo).
const real = JSON.parse(fs.readFileSync(raiz + 'v2/repertorios/cantigas-populares.json', 'utf8'));
F.zerarRelatorio();
assert.deepStrictEqual(F.pacote(real), real);
assert.strictEqual(F.relatorio.removidos + F.relatorio.alterados, 0);
console.log('pacote real → idêntico, 0 alterações');

// 5) idempotência: passar de novo não muda nada
const r2 = F.backup(r.dados);
assert.strictEqual(JSON.stringify(r2.dados.musicas), JSON.stringify(r.dados.musicas));
console.log('TODOS OS TESTES PASSARAM');
