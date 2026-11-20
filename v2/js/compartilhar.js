/*
 * compartilhar.js — Mandar repertório para a banda (item 9) e cardápio de pedidos (item 10).
 * ---------------------------------------------------------------------------
 * Tudo sem servidor:
 *   - ARQUIVO: um backup só com o repertório e as cifras dele. A outra pessoa
 *     abre pelo "Importar" do menu da conta (com prévia, sem duplicar).
 *     No celular usa o "Compartilhar" do sistema (WhatsApp, Drive...).
 *   - QR DA BANDA: só a LISTA (ordem, blocos, título, artista, tom), comprimida
 *     dentro do link "#/receber?d=...". Quem lê o QR abre o app; as músicas que
 *     ela já tem entram com a cifra dela (no tom da banda), as outras entram "sem cifra".
 *   - CARDÁPIO: a lista do show dentro do link de "cardapio.html#d=...".
 *     O público lê o QR e vê as músicas no celular; com WhatsApp configurado,
 *     cada música tem um botão "Pedir" que abre a conversa com o pedido pronto.
 *
 * PARTES
 *   1. EMPACOTAR ........ empacotar / desempacotar (deflate + base64url, com plano B sem compressão)
 *   2. QR ............... svgQr (js/vendor/qrcode.js, MIT), pngQr
 *   3. BANDA ............ abrirBanda(r), arquivoDoRepertorio(r), telaReceber
 *   4. CARDÁPIO ......... abrirCardapio(r)
 */
(function (global) {
    'use strict';
    const { icone, esc, normal, toast, abrirSheet, fecharSheet, prefs, salvarPrefs, confirmar } = UI;

    // AJUSTAR: acima disso o QR fica denso demais para câmeras comuns (o máximo técnico é ~2900).
    const QR_LIMITE = 2300;
    const QR_ALERTA = 1500;

    /* =====================================================================
       1. EMPACOTAR (objeto -> texto curto para caber no link)
       ===================================================================== */
    function b64url(bytes) {
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function deB64url(t) {
        const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4));
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return b;
    }
    async function pelaStream(bytes, stream) {
        const r = new Response(new Blob([bytes]).stream().pipeThrough(stream));
        return new Uint8Array(await r.arrayBuffer());
    }
    /** Objeto -> "z" + deflate em base64url (ou "j" + JSON em base64url se o navegador não comprimir). */
    async function empacotar(obj) {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        if (global.CompressionStream) {
            try { return 'z' + b64url(await pelaStream(bytes, new CompressionStream('deflate-raw'))); } catch (e) { /* plano B abaixo */ }
        }
        return 'j' + b64url(bytes);
    }
    /** Inverso de empacotar. Lança erro se o texto estiver quebrado. */
    async function desempacotar(t) {
        if (!t || !/^[zj][A-Za-z0-9_-]+$/.test(t)) throw new Error('Link incompleto ou corrompido.');
        const quebrado = () => new Error('Link incompleto ou corrompido.');
        let bytes;
        try { bytes = deB64url(t.slice(1)); } catch (e) { throw quebrado(); }
        if (t[0] === 'z') {
            if (!global.DecompressionStream) throw new Error('Este navegador é antigo demais para abrir o link.');
            try { bytes = await pelaStream(bytes, new DecompressionStream('deflate-raw')); } catch (e) { throw quebrado(); }
        }
        if (bytes.length > 512 * 1024) throw new Error('Conteúdo grande demais.');
        try { return JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw quebrado(); }
    }

    /* =====================================================================
       2. QR
       ===================================================================== */
    /** SVG do QR de um texto (gerado pela biblioteca, sem conteúdo do usuário no HTML). */
    function svgQr(texto) {
        const q = qrcode(0, 'L');
        q.addData(texto);
        q.make();
        // scalable = sem tamanho fixo; o style faz ocupar a largura do quadro branco.
        return q.createSvgTag({ cellSize: 4, margin: 16, scalable: true }).replace('<svg ', '<svg style="width:100%;height:auto;display:block" ');
    }
    /** Baixa o QR como PNG (para imprimir ou mandar). */
    function baixarPng(texto, nome) {
        const q = qrcode(0, 'L'); q.addData(texto); q.make();
        const n = q.getModuleCount(), cel = 12, margem = 48, tam = n * cel + margem * 2;
        const c = document.createElement('canvas'); c.width = c.height = tam;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, tam, tam); g.fillStyle = '#000';
        for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(margem + k * cel, margem + r * cel, cel, cel);
        const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = nome + '.png'; a.click();
    }
    /** Endereço do app (sem o #...). */
    const baseApp = () => location.href.split('#')[0].replace(/index\.html$/, '');
    const ehLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const slug = (t) => normal(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'repertorio';

    /** Copia um texto (com plano B para navegadores sem clipboard). */
    async function copiar(t) {
        try { await navigator.clipboard.writeText(t); toast('Link copiado'); }
        catch (e) { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); toast('Link copiado'); } catch (e2) { toast('Não deu para copiar'); } x.remove(); }
    }

    /** Bloco de QR + botões, usado nos dois painéis. */
    function htmlQr(link, aviso) {
        const grande = link.length > QR_ALERTA;
        return '<div style="background:#fff;border-radius:8px;padding:6px;max-width:320px;margin:0 auto">' + svgQr(link) + '</div>' +
            (grande ? '<p class="dica">Lista grande: o QR ficou denso. Se a câmera não ler, aproxime ou use o link.</p>' : '') +
            (ehLocal() ? '<p class="dica">⚠ O app está aberto em <b>' + esc(location.host) + '</b> (só este computador). Para o QR funcionar no celular de outra pessoa, abra o Cifra-Dog pelo endereço publicado (GitHub Pages / Netlify) e gere o QR de lá.</p>' : '') +
            (aviso || '') +
            '<div class="dupla"><button class="bt" data-qr="copiar">' + icone('colar') + 'Copiar link</button><button class="bt" data-qr="png">' + icone('baixar') + 'Baixar imagem</button></div>';
    }

    /** Músicas do repertório, na ordem, com o tom em que a banda toca (tom + semitons do item). */
    async function listaDoRepertorio(r) {
        const ms = Object.fromEntries((await DB.listarMusicas()).map(m => [m.id, m]));
        const out = [];
        for (const it of r.itens) {
            if (it.tipo === 'bloco') { out.push({ bloco: it.nome || 'Bloco' }); continue; }
            const m = ms[it.musicaId]; if (!m) continue;
            const s = it.semitons != null ? it.semitons : (m.semitons || 0);
            out.push({ m, item: it, tom: m.tom ? CifraMotor.transporTom(m.tom, s) : '' });
        }
        return out;
    }

    /* =====================================================================
       3. BANDA
       ===================================================================== */

    /** Backup só com este repertório e as cifras dele (sem curtidas, notas e contadores pessoais). */
    async function arquivoDoRepertorio(r) {
        const lista = await listaDoRepertorio(r);
        const PESSOAIS = ['curtida', 'tocadas', 'abertaEm', 'notas', 'marcadores', 'etapa'];
        const musicas = lista.filter(x => x.m).map(x => { const c = Object.assign({}, x.m); PESSOAIS.forEach(k => delete c[k]); return c; });
        const rep = JSON.parse(JSON.stringify(r));
        return { app: 'Cifra-Dog', versao: 3, exportadoEm: new Date().toISOString(), musicas, repertorios: [rep], meta: {} };
    }

    /** Painel "Mandar para a banda". */
    async function abrirBanda(r) {
        const lista = await listaDoRepertorio(r);
        const n = lista.filter(x => x.m).length;
        const comCifra = lista.filter(x => x.m && (x.m.cifra || '').trim()).length;
        abrirSheet(
            '<h3 style="margin:0 0 4px">Mandar para a banda</h3>' +
            '<p class="dica" style="margin:0 0 10px">' + esc(r.nome) + ' · ' + n + ' músicas (' + comCifra + ' com cifra)</p>' +
            '<button class="op" data-b="arquivo">' + icone('baixar') + '<span class="op-txt">Arquivo com as cifras<br><small>Repertório completo. Quem recebe usa "Importar" no menu da conta.</small></span></button>' +
            '<button class="op" data-b="qr">' + icone('lista') + '<span class="op-txt">QR code da lista<br><small>Ordem, blocos e tons. Rápido para o ensaio; as cifras ficam com cada um.</small></span></button>',
            sh => sh.querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
                if (b.dataset.b === 'arquivo') {
                    const dados = await arquivoDoRepertorio(r);
                    const nome = 'repertorio-' + slug(r.nome) + '.cifradog.json';
                    const arq = new File([JSON.stringify(dados)], nome, { type: 'application/json' });
                    // Celular: menu de compartilhar do sistema. Computador: baixa o arquivo.
                    if (navigator.canShare && navigator.canShare({ files: [arq] })) {
                        try { await navigator.share({ files: [arq], title: r.nome, text: 'Repertório "' + r.nome + '" do Cifra-Dog' }); fecharSheet(); return; }
                        catch (e) { if (e && e.name === 'AbortError') return; }
                    }
                    const a = document.createElement('a'); a.href = URL.createObjectURL(arq); a.download = nome; a.click();
                    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                    fecharSheet(); toast('Arquivo salvo: ' + nome);
                } else {
                    fecharSheet(); setTimeout(() => qrDaBanda(r, lista), 60);
                }
            })
        );
    }

    async function qrDaBanda(r, lista) {
        // i: [título, artista, tom] ou ['#', nome do bloco]
        const dados = { v: 1, n: r.nome, i: lista.map(x => x.bloco !== undefined ? ['#', x.bloco] : [x.m.titulo, x.m.artista || '', x.tom]) };
        const link = baseApp() + '#/receber?d=' + await empacotar(dados);
        if (link.length > QR_LIMITE) { toast('Lista grande demais para um QR. Use o arquivo.'); return; }
        abrirSheet('<h3 style="margin:0 0 8px">QR da lista · ' + esc(r.nome) + '</h3>' +
            htmlQr(link, '<p class="dica">Quem ler abre o Cifra-Dog com o repertório pronto para salvar.</p>'),
            sh => ligarQr(sh, link, 'qr-' + slug(r.nome)));
    }
    function ligarQr(sh, link, nome) {
        sh.querySelector('[data-qr="copiar"]').onclick = () => copiar(link);
        sh.querySelector('[data-qr="png"]').onclick = () => baixarPng(link, nome);
    }

    /** Diferença de tom (−6..+5) para tocar a cifra local no tom da banda. 0 se não der para comparar. */
    function semitonsEntre(deTom, paraTom) {
        const a = CifraMotor.analisarAcorde(deTom || ''), b = CifraMotor.analisarAcorde(paraTom || '');
        if (!a || !b) return 0;
        const menor = t => /^[A-G][#b]?m(?!aj)/.test(t);
        if (menor(deTom) !== menor(paraTom)) return 0;
        return ((b.raiz - a.raiz + 18) % 12) - 6;
    }

    /** Tela #/receber?d=... — mostra a lista recebida e salva como repertório. */
    async function telaReceber(p, q) {
        const tela = document.getElementById('tela');
        tela.innerHTML = '<div class="topo"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button><h1 class="titulo" style="margin:0;flex:1;font-size:22px">Repertório recebido</h1></div><div id="rc"><p class="dica">Abrindo…</p></div>';
        const area = document.getElementById('rc');
        let d;
        try {
            d = await desempacotar(q.d || '');
            if (!d || d.v !== 1 || !Array.isArray(d.i) || !d.i.length || d.i.length > 500) throw new Error('Este link não tem um repertório válido.');
        } catch (e) { area.innerHTML = '<div class="vazio"><p>' + esc(e.message) + '</p><a class="bt prim" href="#/">Ir para o início</a></div>'; return; }

        const ms = await DB.listarMusicas();
        const porNome = new Map(ms.map(m => [normal(m.titulo) + '|' + normal(m.artista || ''), m]));
        const itens = d.i.map(x => {
            if (x[0] === '#') return { bloco: String(x[1] || 'Bloco').slice(0, 60) };
            const titulo = String(x[0] || '').slice(0, 100), artista = String(x[1] || '').slice(0, 100), tom = CifraMotor.ehAcorde(String(x[2] || '')) ? String(x[2]) : '';
            return { titulo, artista, tom, local: porNome.get(normal(titulo) + '|' + normal(artista)) || null };
        }).filter(x => x.bloco || x.titulo);
        const nMus = itens.filter(x => !x.bloco).length, nTem = itens.filter(x => x.local && (x.local.cifra || '').trim()).length;
        let k = 0;
        area.innerHTML =
            '<p class="dica" style="margin:0 0 6px"><b>' + esc(String(d.n || 'Repertório').slice(0, 80)) + '</b> · ' + nMus + ' músicas · você já tem a cifra de ' + nTem + '.</p>' +
            '<div class="lista">' + itens.map(x => x.bloco
                ? '<div class="bloco-rep"><span class="bl-nome">' + esc(x.bloco) + '</span></div>'
                : '<div class="op" style="cursor:default"><span class="num-op">' + (++k) + '</span><span class="op-txt">' + esc(x.titulo) + '<br><small>' + esc(x.artista) +
                  (x.local && (x.local.cifra || '').trim() ? ' · ✓ cifra no aparelho' : ' · sem cifra') + '</small></span>' + (x.tom ? '<span class="badge">' + esc(x.tom) + '</span>' : '') + '</div>').join('') + '</div>' +
            '<div class="barra-salvar"><button class="bt prim cheio" id="rc-salvar">' + icone('check') + 'Salvar repertório</button></div>';

        document.getElementById('rc-salvar').onclick = async (ev) => {
            ev.target.disabled = true;
            const reps = await DB.listarRepertorios();
            let nome = String(d.n || 'Repertório da banda').slice(0, 80);
            if (reps.some(r => normal(r.nome) === normal(nome))) nome += ' (banda)';
            const novos = [];
            for (const x of itens) {
                if (x.bloco) { novos.push({ id: DB.novoId(), tipo: 'bloco', nome: x.bloco }); continue; }
                let m = x.local;
                if (!m) m = await DB.salvarMusica({ titulo: x.titulo, artista: x.artista, tom: x.tom, cifra: '' });
                novos.push({ id: DB.novoId(), tipo: 'musica', musicaId: m.id, semitons: x.local ? semitonsEntre(m.tom, x.tom) : 0 });
            }
            const r = await DB.salvarRepertorio({ nome, descricao: 'Recebido por QR', itens: novos });
            toast('Repertório salvo');
            location.replace('#/repertorio/' + r.id);
        };
    }

    /* =====================================================================
       4. CARDÁPIO DE PEDIDOS
       ===================================================================== */
    async function abrirCardapio(r) {
        const c = prefs().cardapio || {};
        abrirSheet(
            '<h3 style="margin:0 0 4px">Cardápio de pedidos</h3>' +
            '<p class="dica" style="margin:0 0 10px">O público lê o QR e vê as músicas do show no celular. Não precisa de internet no palco nem de servidor.</p>' +
            '<form class="form" id="cd-f"><label for="cd-tit">Nome no topo do cardápio</label><input class="entrada" id="cd-tit" maxlength="60" value="' + esc(c.titulo || r.nome) + '">' +
            '<label for="cd-zap">WhatsApp para pedidos (opcional, com DDD)</label><input class="entrada" id="cd-zap" inputmode="tel" maxlength="20" placeholder="Ex.: 11 91234-5678" value="' + esc(c.whats || '') + '">' +
            '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="cd-art"' + (c.semArtista ? '' : ' checked') + '> Mostrar o artista</label>' +
            '<button class="bt prim cheio" style="margin-top:12px">Gerar QR</button></form>',
            sh => sh.querySelector('#cd-f').onsubmit = async (e) => {
                e.preventDefault();
                const titulo = sh.querySelector('#cd-tit').value.trim() || r.nome;
                let whats = sh.querySelector('#cd-zap').value.replace(/\D/g, '');
                if (whats && whats.length <= 11) whats = '55' + whats;           // AJUSTAR: código do país padrão (Brasil)
                if (whats && (whats.length < 12 || whats.length > 15)) { toast('Número de WhatsApp inválido'); return; }
                const comArtista = sh.querySelector('#cd-art').checked;
                salvarPrefs({ cardapio: { titulo: sh.querySelector('#cd-tit').value.trim(), whats: sh.querySelector('#cd-zap').value.trim(), semArtista: !comArtista } });
                const lista = await listaDoRepertorio(r);
                const dados = { v: 1, n: titulo, w: whats || undefined, i: lista.map(x => x.bloco !== undefined ? ['#', x.bloco] : (comArtista ? [x.m.titulo, x.m.artista || ''] : [x.m.titulo])) };
                const link = baseApp() + 'cardapio.html#d=' + await empacotar(dados);
                if (link.length > QR_LIMITE) { toast('Repertório grande demais para um QR. Tente sem o artista.'); return; }
                fecharSheet();
                setTimeout(() => abrirSheet('<h3 style="margin:0 0 8px">' + esc(titulo) + '</h3>' +
                    htmlQr(link, '<p class="dica">Imprima e deixe na mesa ou no palco. <a href="' + esc(link) + '" target="_blank" rel="noopener">Ver o cardápio ↗</a></p>'),
                    s2 => ligarQr(s2, link, 'cardapio-' + slug(titulo))), 60);
            }
        );
    }

    global.Compartilhar = { svgQr, empacotar, desempacotar, abrirBanda, abrirCardapio, arquivoDoRepertorio, semitonsEntre };
    global.Telas.receber = telaReceber;
})(window);
