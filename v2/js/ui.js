/*
 * ui.js — Peças de interface reaproveitadas por todas as telas:
 * ícones, "capas" geradas, painel inferior (sheet), avisos (toast),
 * perguntas/confirmações e preferências salvas.
 */
(function (global) {
    'use strict';

    /* ---------- Ícones SVG ---------- */
    const P = {
        voltar: 'M15.5 4.5 8 12l7.5 7.5-1.4 1.4L5.2 12l8.9-8.9z',
        coracao: 'M12 21s-7.5-4.6-9.6-9.2C1 8.6 2.9 5 6.4 5c2 0 3.5 1.1 4.3 2.4h2.6C14.1 6.1 15.6 5 17.6 5c3.5 0 5.4 3.6 4 6.8C19.5 16.4 12 21 12 21z',
        coracaoVazio: 'M16.5 5c-1.7 0-3.3.9-4.5 2.4C10.8 5.9 9.2 5 7.5 5 4.5 5 2.2 7.6 3 10.8c.9 3.7 6.6 7.8 9 9.5 2.4-1.7 8.1-5.8 9-9.5.8-3.2-1.5-5.8-4.5-5.8zm0 2c1.8 0 3.1 1.5 2.6 3.4-.6 2.4-4.4 5.4-7.1 7.4-2.7-2-6.5-5-7.1-7.4C4.4 8.5 5.7 7 7.5 7c1.4 0 2.6.9 3.2 2.1h2.6C13.9 7.9 15.1 7 16.5 7z',
        mais: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
        menos: 'M4 11h16v2H4z',
        play: 'M8 5v14l11-7z',
        pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
        pontos: 'M12 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
        ajustes: 'M3 6h11v2H3zm15 0h3v2h-3zm-3-2h2v6h-2zM3 16h4v2H3zm7 0h11v2H10zm-3-2h2v6H7z',
        nota: 'M12 3v10.6A4 4 0 1 0 14 17V7h5V3z',
        lista: 'M3 5h13v2H3zm0 6h13v2H3zm0 6h9v2H3zm15-2v-4h2v4h3v2h-3v4h-2v-4h-3v-2z',
        lixeira: 'M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7z',
        lapis: 'M4 17.2V20h2.8l8.3-8.3-2.8-2.8zm15.7-9.5a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0l-1.6 1.6 2.8 2.8z',
        alca: 'M8 6h2v2H8zm6 0h2v2h-2zM8 11h2v2H8zm6 0h2v2h-2zm-6 5h2v2H8zm6 0h2v2h-2z',
        trocar: 'M7 7h11l-3-3 1.4-1.4L22 8l-5.6 5.4L15 12l3-3H7zm10 10H6l3 3-1.4 1.4L2 16l5.6-5.4L9 12l-3 3h11z',
        bloco: 'M3 11h18v2H3zM5 5h14v3H5zm0 11h14v3H5z',
        proxima: 'M6 6l8.5 6L6 18zm10 0h2v12h-2z',
        anterior: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z',
        palco: 'M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 4v-4h2v6h-6v-2z',
        violao: 'M19.6 2.6 21.4 4.4 17.9 7.9l.7.7-1.4 1.4-.7-.7-2.6 2.6c.9 1.7.7 3.8-.6 5.2-1 1-2.2 1.2-3.3 1.4-.9.1-1.5.3-2 .8-.9 1-2.5 1-3.5 0l-.6-.6c-1-1-1-2.6 0-3.5.5-.5.7-1.1.8-2 .2-1.1.4-2.3 1.4-3.3 1.4-1.4 3.5-1.6 5.2-.6l2.6-2.6-.7-.7 1.4-1.4.7.7zM9.5 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
        baixar: 'M11 3h2v10.2l3.6-3.6L18 11l-6 6-6-6 1.4-1.4 3.6 3.6zM4 19h16v2H4z',
        subir: 'M11 21h-2V10.8l-3.6 3.6L4 13l6-6 6 6-1.4 1.4L11 10.8zM4 3h16v2H4z',
        colar: 'M9 2h6v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm0 4v1h6V6zm-2 0v13h10V6h-1v3H8V6z',
        instalar: 'M11 3h2v9.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6zM5 18h14v3H5z',
        fechar: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
        check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
        repertorio: 'M4 4h12v2H4zm0 4h12v2H4zm0 4h8v2H4zm14-6v8.6a3 3 0 1 0 2 2.8V8h2V6z',
        relogio: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3z',
        busca: 'M10.5 3a7.5 7.5 0 0 1 5.96 12.05l4.74 4.74-1.41 1.41-4.74-4.74A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
        disco: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM12 4a8 8 0 0 1 8 8h-1.5A6.5 6.5 0 0 0 12 5.5z',
        microfone: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z',
        casa: 'M12 3 3 10.5V21h6v-6h6v6h6V10.5z',
        cadeado: 'M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3z',
        estrela: 'M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.2L12 17.8 5.7 21.4l1.7-7.2L2 9.5l7.1-.6z',
        pinca: 'M9 3v4H5v2h6V3zm6 18v-4h4v-2h-6v6zM5 15h4v4h2v-6H5zm10-6V5h-2v6h6V9z',
    };
    const icone = (nome, extra) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '><path d="' + P[nome] + '"/></svg>';

    /* ---------- Texto ---------- */
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    /* Tira acentos e deixa minúsculo, para a busca. */
    const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    /* ---------- Capas geradas (cores vermelho/preto variadas por nome) ---------- */
    // AJUSTAR: paletas das capas (cor 1 -> cor 2)
    const PALETAS = [
        ['#e11d2a', '#3a0a0f'], ['#ff5a36', '#6b1206'], ['#b3122e', '#1d0509'], ['#ff2d55', '#4f0a26'],
        ['#9b0d14', '#141414'], ['#d6336c', '#330a1c'], ['#f03e3e', '#262626'], ['#c2410c', '#2a0d05'],
        ['#7f1d1d', '#000000'], ['#ef4444', '#450a0a'],
    ];
    function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
    function paleta(chave) { return PALETAS[hash(chave) % PALETAS.length]; }
    function estiloCapa(chave) { const p = paleta(chave); return '--c1:' + p[0] + ';--c2:' + p[1]; }

    function capaMusica(m, classe) {
        const arte = 1 + hash(m.titulo + m.artista) % 5;
        return '<div aria-hidden="true" class="capa arte-' + arte + ' ' + (classe || '') + '" style="' + estiloCapa(m.titulo + m.artista) + '"><span class="capa-tom">' + esc(tomAtual(m)) + '</span></div>';
    }
    function capaRep(r, classe) {
        const arte = 1 + hash('rep' + r.nome) % 5;
        return '<div aria-hidden="true" class="capa arte-' + arte + ' ' + (classe || '') + '" style="' + estiloCapa('rep' + r.nome) + '"></div>';
    }
    const capaCurtidas = (classe) => '<div aria-hidden="true" class="capa curtidas arte-0 ' + (classe || '') + '"></div>';

    /* Tom da música já com a transposição salva (ex.: G +2 = A). */
    function tomAtual(m, semitons) {
        const s = semitons == null ? (m.semitons || 0) : semitons;
        if (!m.tom) return '♪';
        return s ? CifraMotor.transporTom(m.tom, s) : m.tom;
    }

    /* ---------- Toast ---------- */
    let tToast;
    function toast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg; t.classList.remove('acao'); t.classList.add('on');
        clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('on'), 2200);
    }
    /* Aviso com um botão (ex.: "Cifra excluída  [Desfazer]"). Some sozinho depois de alguns segundos. */
    // AJUSTAR: por quanto tempo (ms) o botão fica disponível.
    function toastAcao(msg, rotulo, fn, ms) {
        const t = document.getElementById('toast');
        t.textContent = msg + ' ';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'toast-acao'; b.textContent = rotulo;
        b.onclick = () => { clearTimeout(tToast); t.classList.remove('on', 'acao'); fn(); };
        t.appendChild(b); t.classList.add('on', 'acao');
        clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('on', 'acao'), ms || 7000);
    }

    /* ---------- Painel inferior (sheet) ---------- */
    let aoFechar = null;
    let focoAnterior = null;
    function abrirSheet(html, aoMontar, fechou) {
        const fundo = document.getElementById('sheet-fundo');
        const sh = document.getElementById('sheet');
        if (fundo.hidden) focoAnterior = document.activeElement;
        sh.innerHTML = '<button type="button" class="bt-icone sheet-close" aria-label="Fechar painel">' + icone('fechar') + '</button>' + html;
        fundo.hidden = false;
        sh.querySelector('.sheet-close').onclick = fecharSheet;
        sh.setAttribute('aria-label', sh.querySelector('h3, .sh-tit')?.textContent || 'Opções do Cifra-Dog');
        sh.querySelector('.sheet-close').focus({ preventScroll: true });
        sh.onkeydown = (e) => {
            if (e.key !== 'Tab') return;
            const itens = [...sh.querySelectorAll('button, a[href], input, textarea, select, [tabindex="0"]')].filter(x => !x.disabled && x.getClientRects().length);
            const primeiro = itens[0], ultimo = itens[itens.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
        };
        aoFechar = fechou || null;
        if (aoMontar) aoMontar(sh);
        return sh;
    }
    function fecharSheet() {
        const fundo = document.getElementById('sheet-fundo');
        if (fundo.hidden) return;
        fundo.hidden = true; document.getElementById('sheet').innerHTML = '';
        if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true });
        focoAnterior = null;
        const f = aoFechar; aoFechar = null; if (f) f();
    }

    /* Pergunta com campo de texto. Devolve o texto ou null se cancelar. */
    function perguntar(titulo, valor, textoBotao) {
        return new Promise(ok => {
            let resposta = null;
            abrirSheet(
                '<h3 style="margin:0 0 12px">' + esc(titulo) + '</h3>' +
                '<form class="form" id="f-perg"><input class="entrada" id="perg-in" value="' + esc(valor || '') + '" maxlength="80" autocomplete="off">' +
                '<button class="bt prim cheio">' + esc(textoBotao || 'Salvar') + '</button></form>',
                sh => {
                    const inp = sh.querySelector('#perg-in');
                    setTimeout(() => { inp.focus(); inp.select(); }, 60);
                    sh.querySelector('#f-perg').onsubmit = (e) => { e.preventDefault(); resposta = inp.value.trim() || null; fecharSheet(); };
                },
                () => ok(resposta)
            );
        });
    }

    /* Confirmação simples. Devolve true/false. */
    function confirmar(titulo, texto, textoBotao) {
        return new Promise(ok => {
            let resp = false;
            abrirSheet(
                '<h3 style="margin:0 0 6px">' + esc(titulo) + '</h3>' +
                (texto ? '<p style="color:var(--texto-2);margin:0 0 16px">' + esc(texto) + '</p>' : '') +
                '<div class="dupla"><button class="bt" id="c-nao">Cancelar</button><button class="bt prim" id="c-sim">' + esc(textoBotao || 'Confirmar') + '</button></div>',
                sh => {
                    sh.querySelector('#c-nao').onclick = () => fecharSheet();
                    sh.querySelector('#c-sim').onclick = () => { resp = true; fecharSheet(); };
                },
                () => ok(resp)
            );
        });
    }

    /* ---------- Preferências (tamanho da fonte, velocidade...) ---------- */
    const CHAVE_PREFS = 'cifradog:prefs';
    const PADRAO = { fonte: 100, velocidade: 3, bemol: 'auto', simplificar: false, duasColunas: false, cliqueBpm: true, botaoAcao: 'tela-topo' };
    function prefs() {
        try { return Object.assign({}, PADRAO, JSON.parse(localStorage.getItem(CHAVE_PREFS) || '{}')); }
        catch (e) { return Object.assign({}, PADRAO); }
    }
    function salvarPrefs(mudancas) {
        const p = Object.assign(prefs(), mudancas);
        try { localStorage.setItem(CHAVE_PREFS, JSON.stringify(p)); } catch (e) { /* sem espaço: ignora */ }
        return p;
    }

    /* "há 2 dias" etc. */
    function tempoAtras(ms) {
        if (!ms) return '';
        const s = (Date.now() - ms) / 1000;
        if (s < 60) return 'agora';
        if (s < 3600) return 'há ' + Math.floor(s / 60) + ' min';
        if (s < 86400) return 'há ' + Math.floor(s / 3600) + ' h';
        const d = Math.floor(s / 86400);
        return d === 1 ? 'ontem' : 'há ' + d + ' dias';
    }

    /* ---------- A pessoa está rolando a tela com o dedo / roda do mouse? ----------
     * Usado pelas rolagens automáticas para NÃO brigar com o dedo: enquanto o dedo está na tela,
     * durante o "embalo" depois de soltar (inércia) e logo após girar a roda do mouse,
     * elas esperam em vez de mover a tela. Devolve true nesses momentos. */
    // AJUSTAR: quanto tempo (ms) sem movimento conta como "o embalo acabou".
    const ESPERA_SOLTAR_MS = 160;
    // AJUSTAR: tempo máximo (ms) esperando o embalo, para a rolagem nunca ficar presa.
    const ESPERA_MAX_MS = 2500;
    let dedos = 0, esperaAte = 0, soltouEm = 0;
    const agora = () => performance.now();
    window.addEventListener('touchstart', (e) => { dedos = e.touches.length; }, { passive: true, capture: true });
    const fimToque = (e) => { dedos = e.touches.length; if (!dedos) { soltouEm = agora(); esperaAte = soltouEm + ESPERA_SOLTAR_MS; } };
    window.addEventListener('touchend', fimToque, { passive: true, capture: true });
    window.addEventListener('touchcancel', fimToque, { passive: true, capture: true });
    window.addEventListener('wheel', () => { soltouEm = agora(); esperaAte = soltouEm + 220; }, { passive: true, capture: true });
    // Enquanto o embalo dura, cada movimento da tela adia um pouco a volta da rolagem automática.
    window.addEventListener('scroll', () => {
        const t = agora();
        if (!dedos && t < esperaAte && t - soltouEm < ESPERA_MAX_MS) esperaAte = t + ESPERA_SOLTAR_MS;
    }, { passive: true, capture: true });
    function usuarioRolando() { return dedos > 0 || agora() < esperaAte; }

    global.UI = {
        icone, esc, normal, estiloCapa, paleta, capaMusica, capaRep, capaCurtidas, tomAtual,
        toast, toastAcao, abrirSheet, fecharSheet, perguntar, confirmar, prefs, salvarPrefs, tempoAtras,
        usuarioRolando,
    };
})(window);
