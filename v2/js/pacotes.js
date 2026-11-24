/*
 * pacotes.js — Pacotes de músicas (cifras livres baixadas sob demanda).
 * ---------------------------------------------------------------------------
 * PARA QUE SERVE
 *   O app NÃO traz músicas dentro dele. Os pacotes ficam num site estático
 *   (GitHub Pages, repositório "cifradog-pacotes"). Esta tela baixa o
 *   CATÁLOGO (lista leve de pacotes) e, quando a pessoa toca em "Instalar",
 *   baixa o pacote, confere se veio inteiro (sha256), converte cada música
 *   para o formato do app (acordes em cima da letra) e guarda no IndexedDB.
 *   Depois disso tudo funciona sem internet.
 *
 * FORMATO DOS ARQUIVOS: esquema "cifradog.schema.json" (no repositório dos pacotes).
 *   catálogo -> { formato:'cifradog.catalogo', versao:1, pacotes:[{id,nome,revisao,arquivo,qtdMusicas,sha256,licenca}] }
 *   pacote   -> { formato:'cifradog.pacote', versao:1, pacote:{id,nome,revisao}, musicas:[{id,titulo,artista,tom,licenca,secoes}] }
 *
 * PARTES DESTE ARQUIVO
 *   1. CONFIGURAÇÃO ........ endereço do catálogo, fontes livres, nomes das licenças
 *   2. DOWNLOAD E CHECAGEM . baixarJson, sha256, validarCatalogo, validarPacote
 *   3. CONVERSÃO ........... musicaParaCifra, paraMusicaApp
 *   4. INSTALAÇÃO .......... instalar (junta sem duplicar e sem apagar edições suas)
 *   5. TELA #/pacotes ...... telaPacotes
 *
 * Usa: UI (ui.js), DB (db.js), CifraMotor (cifra-motor.js), Catalogo (catalogo.js), Telas (telas.js).
 */
(function (global) {
    'use strict';
    const { icone, esc, normal, toast, abrirSheet, fecharSheet, confirmar, prefs, salvarPrefs } = UI;

    /* =====================================================================
       1. CONFIGURAÇÃO
       ===================================================================== */

    // AJUSTAR: endereço do catálogo publicado no GitHub Pages (troque se o repositório tiver outro nome).
    const CATALOGO_GITHUB = 'https://rolfis-rafael.github.io/cifradog-pacotes/catalogo.json';
    // No XAMPP (localhost) usa a pasta vizinha "cifradog-pacotes", para testar antes de publicar.
    const CATALOGO_LOCAL = '../cifradog-pacotes/catalogo.json';
    const ehLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

    // ONDE: fontes de cifras livres mostradas no editor e nesta tela. AJUSTAR: só inclua fontes com licença conferida.
    const FONTES_LIVRES = [
        { nome: 'Cifras.com.br · Domínio Público', url: 'https://www.cifras.com.br/dominio-publico',
          desc: 'Músicas tradicionais e de domínio público. Confira a origem de cada cifra antes de usar.' },
        { nome: 'Canções de Natal em ChordPro (pathawks)', url: 'https://github.com/pathawks/christmas-songs',
          desc: 'Arquivos .cho de domínio público: baixe e use "Abrir arquivo" no editor.' },
        { nome: 'Canções de Natal em ChordPro (cardinote)', url: 'https://github.com/cardinote/christmas-chords-lyrics',
          desc: 'Mais canções de Natal de domínio público, também em ChordPro.' },
    ];

    const LICENCAS = {
        'dominio-publico': 'Domínio público', cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA',
        autorizado: 'Autorizado pelo autor', transcricao: 'Cifra transcrita pelo autor do pacote', pessoal: 'Pessoal',
    };
    const NOMES_SECAO = {
        intro: 'Intro', verso: 'Verso', 'pre-refrao': 'Pré-refrão', refrao: 'Refrão', ponte: 'Ponte',
        solo: 'Solo', interludio: 'Interlúdio', final: 'Final', outro: 'Outro',
    };
    // AJUSTAR: limites de segurança para arquivos baixados.
    const MAX_BYTES = 5 * 1024 * 1024, MAX_MUSICAS = 3000;
    const RE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    /** Endereço do catálogo em uso: o escolhido pela pessoa, senão o local (XAMPP) ou o do GitHub. */
    function urlCatalogo() {
        const p = prefs().pacotesUrl;
        if (p) return p;
        return ehLocal ? new URL(CATALOGO_LOCAL, location.href).href : CATALOGO_GITHUB;
    }

    /** Só aceita links http(s): um "javascript:" vindo de um pacote viraria um link perigoso. */
    function linkSeguro(u) {
        if (typeof u !== 'string') return '';
        try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; }
    }

    /* =====================================================================
       2. DOWNLOAD E CHECAGEM
       ===================================================================== */

    /** Baixa um JSON. Devolve { json, bytes } (bytes = ArrayBuffer, usado no sha256). */
    async function baixarJson(url) {
        let r;
        try { r = await fetch(url, { cache: 'no-cache' }); }
        catch (e) { throw new Error('Sem conexão com o servidor dos pacotes.'); }
        if (!r.ok) throw new Error('O servidor respondeu ' + r.status + ' (' + url + ').');
        const bytes = await r.arrayBuffer();
        if (bytes.byteLength > MAX_BYTES) throw new Error('Arquivo grande demais.');
        return { bytes, json: lerJson(new TextDecoder().decode(bytes)) };
    }
    function lerJson(texto) {
        try { return JSON.parse(texto); } catch (e) { throw new Error('O arquivo não é um JSON válido.'); }
    }

    /** sha256 em hexadecimal. Devolve null se o navegador não tiver crypto.subtle (página sem HTTPS). */
    async function sha256(bytes) {
        if (!(global.crypto && crypto.subtle)) return null;
        const h = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /** Confere o catálogo. Lança erro com mensagem amigável se algo estiver errado. */
    function validarCatalogo(c) {
        if (!c || c.formato !== 'cifradog.catalogo') throw new Error('Isso não é um catálogo do Cifra-Dog.');
        if (c.versao !== 1) throw new Error('Catálogo de uma versão mais nova. Atualize o app.');
        if (!Array.isArray(c.pacotes)) throw new Error('Catálogo sem lista de pacotes.');
        return c.pacotes.filter(p => p && RE_ID.test(p.id || '') && typeof p.arquivo === 'string' && Number.isInteger(p.revisao));
    }

    /** Confere um pacote inteiro (mesmas regras do esquema, as que importam para o app). */
    function validarPacote(p) {
        p = FiltroJson.pacote(p);   // filtro de segurança (js/filtro-json.js): devolve uma cópia limpa
        if (!p || p.formato !== 'cifradog.pacote') throw new Error('Isso não é um pacote de músicas do Cifra-Dog.');
        if (p.versao !== 1) throw new Error('Pacote de uma versão mais nova. Atualize o app.');
        const info = p.pacote || {};
        if (!RE_ID.test(info.id || '') || !info.nome || !Number.isInteger(info.revisao)) throw new Error('Pacote sem id, nome ou revisão.');
        if (!Array.isArray(p.musicas) || !p.musicas.length) throw new Error('Pacote sem músicas.');
        if (p.musicas.length > MAX_MUSICAS) throw new Error('Pacote com músicas demais.');
        const ids = new Set();
        p.musicas.forEach((m, i) => {
            const onde = 'Música ' + (i + 1);
            if (!m || !RE_ID.test(m.id || '') || ids.has(m.id)) throw new Error(onde + ': id ausente ou repetido.');
            ids.add(m.id);
            if (!m.titulo || !m.artista || !m.tom) throw new Error(onde + ': falta título, artista ou tom.');
            if (!Array.isArray(m.secoes) || !m.secoes.length) throw new Error(onde + ': sem seções.');
            const lic = m.licenca || {};
            // Pacote é para compartilhar: cifra "pessoal" ou sem fonte não entra.
            if (!LICENCAS[lic.tipo] || lic.tipo === 'pessoal') throw new Error(onde + ' (' + m.titulo + '): licença ausente ou pessoal.');
            if (!lic.fonte) throw new Error(onde + ' (' + m.titulo + '): falta a fonte da licença.');
            if ((lic.tipo === 'cc-by' || lic.tipo === 'cc-by-sa') && !lic.atribuicao) throw new Error(onde + ': CC BY exige o crédito (atribuição).');
        });
        return p;
    }

    /* =====================================================================
       3. CONVERSÃO (formato do pacote -> texto da cifra do app)
       ===================================================================== */

    /**
     * Monta o texto da cifra: cada seção vira "[Nome]" e cada linha ChordPro ("[G]Ciranda")
     * vira acordes em cima da letra (CifraMotor.chordProParaCifra faz o encaixe).
     */
    function musicaParaCifra(mu) {
        const linhas = [];
        mu.secoes.forEach((s, i) => {
            if (i) linhas.push('');
            const nome = String(s.nome || NOMES_SECAO[s.tipo] || 'Parte').replace(/[\[\]]/g, '');
            linhas.push('[' + nome + (s.repetir > 1 ? ' (' + s.repetir + 'x)' : '') + ']');
            (s.linhas || []).forEach(l => {
                const t = String((l && l.texto) || '');
                linhas.push(l && l.tipo === 'obs' ? '(' + t.replace(/^\(|\)$/g, '') + ')' : t);
            });
        });
        return CifraMotor.chordProParaCifra(linhas.join('\n')).texto;
    }

    /** "Assinatura" curta de um texto: serve para saber se a pessoa editou a cifra depois de instalar. */
    function assinatura(t) {
        let h = 5381;
        for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
        return t.length + ':' + (h >>> 0).toString(36);
    }

    /** Converte uma música do pacote para os campos que o app guarda. */
    function paraMusicaApp(mu, info) {
        const lic = Object.assign({}, mu.licenca);
        const url = linkSeguro(lic.url);
        if (url) lic.url = url; else delete lic.url;
        const cifra = musicaParaCifra(mu);
        const generoOk = mu.genero && Catalogo.generos.some(g => g.id === normal(mu.genero));
        return {
            titulo: String(mu.titulo).slice(0, 100),
            artista: String(mu.artista).slice(0, 100),
            tom: CifraMotor.ehAcorde(mu.tom) ? mu.tom : CifraMotor.detectarTom(cifra),
            capo: Math.max(0, Math.min(12, parseInt(mu.capo, 10) || 0)),
            bpm: Math.max(0, Math.min(300, parseInt(mu.bpm, 10) || 0)),
            compasso: /^\d{1,2}\/\d{1,2}$/.test(mu.compasso || '') ? mu.compasso : '4/4',
            genero: generoOk ? normal(mu.genero) : '',
            fonte: url,
            cifra,
            licenca: lic,
            pacote: { id: info.id, nome: info.nome, revisao: info.revisao, musicaId: mu.id, assinatura: assinatura(cifra) },
        };
    }

    /* =====================================================================
       4. INSTALAÇÃO
       ===================================================================== */

    /** Pacotes já instalados: { idDoPacote: { nome, revisao, em } }. */
    async function instalados() { return (await DB.lerMeta('pacotes-instalados')) || {}; }

    /**
     * Instala ou atualiza um pacote (já validado).
     * Regras para não estragar nada:
     *   - música nova -> adiciona;
     *   - veio deste pacote e não foi editada -> atualiza se a revisão for maior;
     *   - veio deste pacote mas você editou -> mantém a sua;
     *   - você já tinha uma música com o mesmo título e artista -> mantém a sua.
     * Devolve { novas, atualizadas, iguais, mantidas }.
     */
    async function instalar(p, montarRepertorio = false) {
        const info = p.pacote;
        const locais = await DB.listarMusicas();
        const chave = (t, a) => normal(t) + '|' + normal(a);
        const porPacote = new Map(), porNome = new Map();
        locais.forEach(m => {
            if (m.pacote && m.pacote.id) porPacote.set(m.pacote.id + '/' + m.pacote.musicaId, m);
            porNome.set(chave(m.titulo, m.artista), m);
        });
        const r = { novas: 0, atualizadas: 0, iguais: 0, mantidas: 0 };
        const musicasDoRepertorio = new Set();
        for (const mu of p.musicas) {
            const nova = paraMusicaApp(mu, info);
            const ja = porPacote.get(info.id + '/' + mu.id) || porNome.get(chave(nova.titulo, nova.artista));
            if (!ja) {
                const salva = await DB.salvarMusica(nova);
                porNome.set(chave(nova.titulo, nova.artista), salva);
                musicasDoRepertorio.add(salva.id);
                r.novas++;
                continue;
            }
            musicasDoRepertorio.add(ja.id);
            const doPacote = ja.pacote && ja.pacote.id === info.id;
            if (!doPacote) { r.mantidas++; continue; }
            const editada = ja.pacote.assinatura && assinatura(ja.cifra || '') !== ja.pacote.assinatura;
            if (editada) { r.mantidas++; continue; }
            if ((ja.pacote.revisao || 0) >= info.revisao) { r.iguais++; continue; }
            // Atualiza a cifra, mas mantém o que é seu (curtida, transposição, BPM ajustado, notas...).
            const mud = Object.assign({}, ja, { cifra: nova.cifra, licenca: nova.licenca, fonte: nova.fonte || ja.fonte, pacote: nova.pacote });
            if (ja.tom !== nova.tom) { mud.tom = nova.tom; mud.semitons = 0; }
            await DB.salvarMusica(mud);
            r.atualizadas++;
        }
        if (montarRepertorio) {
            const id = 'pacote-' + info.id;
            if (!(await DB.pegarRepertorio(id))) {
                const itens = [...musicasDoRepertorio].map(musicaId => ({ id: DB.novoId(), tipo: 'musica', musicaId, semitons: 0 }));
                await DB.salvarRepertorio({ id, nome: info.nome, itens });
            }
        }
        const ins = await instalados();
        ins[info.id] = { nome: info.nome, revisao: info.revisao, em: Date.now() };
        await DB.gravarMeta('pacotes-instalados', ins);
        return r;
    }

    /** Texto do resultado de uma instalação, para o aviso. */
    function resumo(r) {
        const partes = [];
        if (r.novas) partes.push(r.novas + ' nova' + (r.novas > 1 ? 's' : ''));
        if (r.atualizadas) partes.push(r.atualizadas + ' atualizada' + (r.atualizadas > 1 ? 's' : ''));
        if (r.mantidas) partes.push(r.mantidas + ' mantida' + (r.mantidas > 1 ? 's' : '') + ' (sua versão)');
        if (r.iguais && !partes.length) partes.push('tudo já estava em dia');
        return partes.join(' · ');
    }

    /** Baixa, confere e instala um pacote do catálogo. */
    async function instalarDoCatalogo(e, montarRepertorio = false) {
        const url = new URL(e.arquivo, urlCatalogo()).href;
        const { bytes, json } = await baixarJson(url);
        if (e.sha256) {
            const h = await sha256(bytes);
            if (h && h !== e.sha256) throw new Error('O pacote veio diferente do catálogo (download corrompido ou catálogo desatualizado).');
        }
        return instalar(validarPacote(json), montarRepertorio);
    }

    /* =====================================================================
       5. TELA #/pacotes
       ===================================================================== */

    async function telaPacotes(_params, q = {}) {
        const tela = document.getElementById('tela');
        const somenteArquivo = q.arquivo === '1';
        tela.innerHTML =
            '<div class="topo"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button>' +
            '<h1 class="titulo" style="margin:0;flex:1;font-size:22px">' + (somenteArquivo ? 'Importar repertório' : 'Pacotes de músicas') + '</h1></div>' +
            (somenteArquivo ?
                '<p>Selecione o arquivo JSON que você baixou. O repertório ficará disponível na aba Show.</p>' +
                '<div class="dupla"><button class="bt prim" id="pc-arquivo">' + icone('subir') + 'Escolher arquivo</button></div>' +
                '<input type="file" id="pc-input" accept=".json,application/json" hidden>' :
            '<p class="dica" style="margin:0 0 12px">Pacotes de cifras prontos. Depois de instalar, funcionam sem internet. As músicas que você já tem nunca são substituídas.</p>' +
            '<h2 class="secao">Catálogo</h2><div id="pc-lista"><p class="dica">Carregando o catálogo…</p></div>' +
            '<div class="dupla" style="margin-top:10px"><button class="bt" id="pc-arquivo">' + icone('subir') + 'Pacote de arquivo</button>' +
            '<button class="bt" id="pc-recarregar">' + icone('trocar') + 'Atualizar lista</button></div>' +
            '<input type="file" id="pc-input" accept=".json,application/json" hidden>' +
            '<h2 class="secao">Procurar cifra na internet</h2>' + htmlFontes() +
            '<p class="dica">Achou a cifra? Copie, toque em <a href="#/criar">Nova cifra</a> e cole: o app separa acordes e letra sozinho.</p>' +
            '<h2 class="secao">Avançado</h2><button class="op" id="pc-url">' + icone('ajustes') + 'Endereço do catálogo<span class="op-dir" style="max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(urlCatalogo()) + '</span></button>');

        const $ = (id) => document.getElementById(id);
        let catalogo = [];

        async function carregar() {
            const lista = $('pc-lista'); if (!lista) return;
            lista.innerHTML = '<p class="dica">Carregando o catálogo…</p>';
            let erro = '';
            try {
                const { json } = await baixarJson(urlCatalogo());
                catalogo = validarCatalogo(json);
                await DB.gravarMeta('pacotes-ultimo-catalogo', catalogo);   // para mostrar a lista sem internet
            } catch (e) {
                erro = e.message;
                catalogo = (await DB.lerMeta('pacotes-ultimo-catalogo')) || [];
            }
            await desenharLista(erro);
        }

        async function desenharLista(erro) {
            const lista = $('pc-lista'); if (!lista) return;
            const ins = await instalados();
            let h = erro ? '<p class="dica" style="color:var(--acento,#e35)">Não deu para abrir o catálogo agora: ' + esc(erro) + (catalogo.length ? ' Mostrando a última lista salva.' : '') + '</p>' : '';
            if (!catalogo.length && !erro) h += '<p class="dica">O catálogo ainda não tem pacotes.</p>';
            h += catalogo.map((p, i) => {
                const atual = ins[p.id];
                const estado = !atual ? 'novo' : (atual.revisao < p.revisao ? 'atualizar' : 'ok');
                const botao = estado === 'novo' ? 'Instalar' : estado === 'atualizar' ? 'Atualizar' : 'Instalado ✓';
                return '<div class="op" style="align-items:flex-start;cursor:default">' + icone('disco') +
                    '<span class="op-txt" style="flex:1">' + esc(p.nome) + '<br><small>' + esc(p.descricao || '') + '</small><br>' +
                    '<small><span class="badge">' + (Number(p.qtdMusicas) || '?') + ' músicas</span> <span class="badge">' + esc(LICENCAS[p.licenca] || p.licenca || '') + '</span>' +
                    (estado === 'atualizar' ? ' <span class="badge verm">nova versão</span>' : '') + '</small></span>' +
                    '<button class="bt' + (estado === 'ok' ? '' : ' prim') + '" data-pc="' + i + '" style="flex-shrink:0">' + botao + '</button></div>';
            }).join('');
            lista.innerHTML = h;
            lista.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => perguntarInstalar(catalogo[+b.dataset.pc], ins[catalogo[+b.dataset.pc].id], b));
        }

        async function perguntarInstalar(p, atual, botao) {
            const ok = await confirmar(
                (atual ? 'Reinstalar' : 'Instalar') + ' "' + p.nome + '"?',
                (Number(p.qtdMusicas) || 'Várias') + ' músicas · ' + (LICENCAS[p.licenca] || '') + '. Músicas suas com o mesmo nome continuam como estão.',
                atual ? 'Atualizar' : 'Instalar');
            if (!ok) return;
            botao.disabled = true; botao.textContent = 'Baixando…';
            try { toast('Pacote instalado: ' + resumo(await instalarDoCatalogo(p))); }
            catch (e) { toast(e.message); }
            await desenharLista('');
        }

        $('pc-arquivo').onclick = () => $('pc-input').click();
        $('pc-input').onchange = async (ev) => {
            const f = ev.target.files[0]; ev.target.value = '';
            if (!f) return;
            try {
                if (f.size > MAX_BYTES) throw new Error('Arquivo grande demais.');
                const p = validarPacote(lerJson(await f.text()));
                if (!(await confirmar('Instalar "' + p.pacote.nome + '"?', p.musicas.length + ' músicas, do arquivo ' + f.name + '.', 'Instalar'))) return;
                const resultado = await instalar(p, somenteArquivo);
                toast('Pacote instalado: ' + resumo(resultado));
                if (somenteArquivo) location.hash = '#/repertorio/pacote-' + p.pacote.id;
                else await desenharLista('');
            } catch (e) { toast(e.message); }
        };
        if (somenteArquivo) return;
        $('pc-recarregar').onclick = carregar;
        // Endereço do catálogo: painel próprio (o "perguntar" do app corta em 80 letras e não aceita vazio).
        $('pc-url').onclick = () => {
            let mudou = false;
            abrirSheet(
                '<h3 style="margin:0 0 6px">Endereço do catálogo</h3>' +
                '<p class="dica" style="margin:0 0 10px">Padrão: ' + esc(ehLocal ? CATALOGO_LOCAL + ' (XAMPP)' : CATALOGO_GITHUB) + '</p>' +
                '<form class="form" id="pc-f"><input class="entrada" id="pc-in" type="url" maxlength="400" autocomplete="off" placeholder="https://.../catalogo.json" value="' + esc(prefs().pacotesUrl || '') + '">' +
                '<div class="dupla"><button type="button" class="bt" id="pc-padrao">Usar o padrão</button><button class="bt prim">Salvar</button></div></form>',
                sh => {
                    const inp = sh.querySelector('#pc-in');
                    sh.querySelector('#pc-padrao').onclick = () => { salvarPrefs({ pacotesUrl: '' }); mudou = true; fecharSheet(); };
                    sh.querySelector('#pc-f').onsubmit = (e) => {
                        e.preventDefault();
                        const v = inp.value.trim();
                        if (v && !linkSeguro(v)) { toast('Use um endereço que comece com http:// ou https://'); return; }
                        salvarPrefs({ pacotesUrl: v }); mudou = true; fecharSheet();
                    };
                },
                () => { if (mudou && location.hash === '#/pacotes') telaPacotes(); }
            );
        };
        /* Vindo do site de download (#/pacotes?instalar=<id>): pergunta, instala e já abre o repertório. */
        async function instalarDireto(id) {
            const p = catalogo.find(x => x.id === id);
            if (!p) { toast('Não achei esse pacote no catálogo. Escolha na lista.'); return; }
            const ok = await confirmar('Instalar "' + p.nome + '"?',
                (Number(p.qtdMusicas) || 'Várias') + ' músicas · ' + (LICENCAS[p.licenca] || '') + '. Elas funcionam sem internet e viram um repertório na aba Show. Músicas suas com o mesmo nome continuam como estão.', 'Instalar');
            if (!ok) return;
            try {
                toast('Baixando…');
                const r = await instalarDoCatalogo(p, true);
                toast('Pacote instalado: ' + resumo(r));
                location.hash = '#/repertorio/pacote-' + p.id;
            } catch (e) { toast(e.message); }
        }
        carregar().then(() => { if (q.instalar && RE_ID.test(q.instalar)) instalarDireto(q.instalar); });
    }

    /* Procurar cifra na internet: abre a pesquisa numa nova aba do navegador (o app não guarda nem envia nada). */
    const SITES_BUSCA = {
        google: t => 'https://www.google.com/search?q=' + encodeURIComponent('cifra ' + t),
        cifraclub: t => 'https://www.cifraclub.com.br/?q=' + encodeURIComponent(t),
    };
    function htmlFontes() {
        return '<form class="form" data-busca-cifra>' +
            '<label>Música ou artista</label>' +
            '<input class="entrada" name="termo" type="search" maxlength="120" autocomplete="off" placeholder="Ex.: Tempo Perdido Legião Urbana">' +
            '<div class="dupla" style="margin-top:8px"><button class="bt prim" type="submit" data-site="google">' + icone('busca') + 'Procurar no Google</button>' +
            '<button class="bt" type="button" data-site="cifraclub">Cifra Club</button></div></form>';
    }
    function procurarCifra(form, site) {
        const termo = form.elements.termo.value.trim();
        if (!termo) { form.elements.termo.focus(); return; }
        window.open(SITES_BUSCA[site](termo), '_blank', 'noopener,noreferrer');
    }
    document.addEventListener('submit', (e) => {
        const f = e.target.closest && e.target.closest('form[data-busca-cifra]');
        if (f) { e.preventDefault(); procurarCifra(f, 'google'); }
    });
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('form[data-busca-cifra] button[type=button][data-site]');
        if (b) procurarCifra(b.form, b.dataset.site);
    });

    global.Pacotes = {
        FONTES_LIVRES, LICENCAS, urlCatalogo, htmlFontes, validarPacote, validarCatalogo,
        musicaParaCifra, paraMusicaApp, instalar, instalados, linkSeguro,
    };
    global.Telas.pacotes = telaPacotes;
})(window);
