/*
 * dicas-rolagem.js — "Tem mais aqui": avisa a pessoa quando existe conteúdo escondido.
 * ---------------------------------------------------------------------------
 * PROBLEMA
 *   Quem abre o app pela primeira vez não sabe que dá para rolar. Se a dobra da tela cair
 *   justo entre dois itens, parece que a lista acabou. Hoje o "pedacinho" que aparece
 *   embaixo depende da altura do aparelho (coincidência).
 *
 * O QUE ESTE ARQUIVO FAZ (o visual fica em css/dicas.css)
 *   1. PÁGINA ...... degradê + setinha logo acima da barra de baixo, enquanto houver conteúdo
 *                    abaixo (body.tem-mais). A setinha só aparece no topo da tela (body.dica-topo)
 *                    e toca para rolar. Fica desligado na cifra/palco, no computador e onde já
 *                    existe uma barra fixa de ação (.barra-salvar).
 *   2. CARROSSÉIS .. ajusta a largura dos cartões para SEMPRE aparecer uns 40% do próximo
 *                    (no iPhone de 390px aparecia só uma lasca de 20px).
 *   3. CHIPS ....... esmaece a borda onde a fileira continua (data-mais="esq|dir|esq dir").
 *   4. PAINEL ...... degradê no fundo do painel inferior (#sheet) enquanto houver mais itens.
 *
 * Não muda nenhum dado nem nenhuma tela: só lê medidas e liga/desliga classes e atributos.
 * Usa o que já existe: #tela, #nav, #sheet, body.tela-cifra, body.palco.
 */
(function () {
    'use strict';

    /* ---------- AJUSTAR ---------- */
    const LIMITE_PX = 12;          // quanto conteúdo precisa sobrar abaixo para mostrar a dica
    const TOPO_PX = 120;           // a setinha só aparece enquanto a pessoa está perto do topo
    const HORIZONTAIS = '.chips, .faixa-acordes';
    const CARROSSEIS = '.carrossel';
    const FRACAO_ALVO = 0.4;       // quanto do próximo cartão deve aparecer (0.4 = 40%)
    const FRACAO_MIN = 0.25;       // se já aparece entre 25% e 80% do próximo cartão, não mexe
    const FRACAO_MAX = 0.8;

    const computador = window.matchMedia('(min-width: 900px)');
    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    let quadro = 0;

    /* ---------- 1. PÁGINA ---------- */
    function dicaPagina() {
        const b = document.body, tela = document.getElementById('tela'), nav = document.getElementById('nav');
        const desligar = computador.matches || !tela || !nav
            || b.classList.contains('tela-cifra') || b.classList.contains('palco')
            || tela.querySelector('.barra-salvar');
        if (desligar) { b.classList.remove('tem-mais', 'dica-topo'); return; }
        // O fim "de verdade" do conteúdo: o fim da #tela menos o espaço vazio reservado para a barra de baixo.
        const reserva = parseFloat(getComputedStyle(tela).paddingBottom) || 0;
        const fimDoConteudo = tela.getBoundingClientRect().bottom - reserva;
        const topoDaBarra = nav.getBoundingClientRect().top;
        const mais = fimDoConteudo - topoDaBarra > LIMITE_PX;
        b.classList.toggle('tem-mais', mais);
        b.classList.toggle('dica-topo', mais && window.scrollY < TOPO_PX);
    }

    /* ---------- 2. CARROSSÉIS: sempre um pedaço do próximo cartão ---------- */
    function dicaCarrossel(el) {
        el.removeAttribute('data-peek');          // mede sempre com a largura original (sem o nosso ajuste)
        el.style.removeProperty('--cartao-w');
        if (computador.matches) return;
        const cartoes = el.children;
        if (cartoes.length < 2) return;
        const cs = getComputedStyle(el);
        const gap = parseFloat(cs.columnGap) || 0, pad = parseFloat(cs.paddingLeft) || 0;
        const w0 = cartoes[0].getBoundingClientRect().width;
        const visivel = el.clientWidth - pad;
        if (!w0 || visivel <= 0) return;           // escondido
        if (cartoes.length * (w0 + gap) - gap <= visivel + 1) return;   // cabe tudo: não rola
        const n0 = (visivel + gap) / (w0 + gap);   // quantos cartões aparecem hoje (com fração)
        const f = n0 - Math.floor(n0);
        if (f >= FRACAO_MIN && f <= FRACAO_MAX) return;   // já mostra um bom pedaço do próximo
        const k = Math.max(1, Math.round(n0 - FRACAO_ALVO));   // número inteiro de cartões mais próximo do tamanho atual
        const n = k + FRACAO_ALVO;
        const w = (visivel + gap) / n - gap;
        el.style.setProperty('--cartao-w', w.toFixed(1) + 'px');
        el.setAttribute('data-peek', '');
    }

    /* ---------- 3. CHIPS: borda esmaecida onde continua ---------- */
    function dicaHorizontal(el) {
        const max = el.scrollWidth - el.clientWidth;
        let v = '';
        if (max > 4) {
            const x = Math.abs(el.scrollLeft);
            if (x > 4) v = 'esq';
            if (x < max - 4) v += (v ? ' ' : '') + 'dir';
        }
        if (v) { if (el.dataset.mais !== v) el.dataset.mais = v; }
        else if ('mais' in el.dataset) delete el.dataset.mais;
    }

    /* ---------- 4. PAINEL INFERIOR ---------- */
    function dicaPainel() {
        const sh = document.getElementById('sheet');
        if (!sh) return;
        const mais = sh.scrollHeight - sh.scrollTop - sh.clientHeight > 8;
        if (mais !== sh.hasAttribute('data-mais-baixo')) sh.toggleAttribute('data-mais-baixo', mais);
    }

    function tudo() {
        dicaPagina();
        dicaPainel();
        document.querySelectorAll(CARROSSEIS).forEach(dicaCarrossel);
        document.querySelectorAll(HORIZONTAIS).forEach(dicaHorizontal);
    }
    function agendar() {
        if (quadro) return;
        quadro = requestAnimationFrame(() => { quadro = 0; tudo(); });
    }

    /* ---------- Setinha (toque rola um pouco) ---------- */
    function criarSeta() {
        const caixa = document.createElement('div');
        caixa.id = 'dica-mais';
        caixa.setAttribute('aria-hidden', 'true');   // é só um reforço visual; a rolagem normal continua igual
        const botao = document.createElement('button');
        botao.type = 'button'; botao.tabIndex = -1;
        botao.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"><path d="M5.5 9.5 12 16l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        botao.addEventListener('click', () => window.scrollBy({ top: Math.round(window.innerHeight * 0.6), behavior: menosMovimento.matches ? 'auto' : 'smooth' }));
        caixa.appendChild(botao);
        document.body.appendChild(caixa);
    }

    function iniciar() {
        criarSeta();
        // Rolagem: a da página, a do painel e a de cada fileira horizontal (scroll não "sobe", por isso o capture).
        document.addEventListener('scroll', (e) => {
            const t = e.target;
            if (t === document || t === document.documentElement || t === document.body) dicaPagina();
            else if (t.id === 'sheet') dicaPainel();
            else if (t.matches && t.matches(HORIZONTAIS)) dicaHorizontal(t);
        }, { capture: true, passive: true });

        // Tela nova, painel aberto, imagem carregada, rotação do aparelho: recalcula.
        const mo = new MutationObserver(agendar);
        for (const id of ['tela', 'sheet']) { const el = document.getElementById(id); if (el) mo.observe(el, { childList: true, subtree: true }); }
        const tela = document.getElementById('tela');
        if (tela && window.ResizeObserver) new ResizeObserver(agendar).observe(tela);
        window.addEventListener('resize', agendar, { passive: true });
        window.addEventListener('hashchange', agendar);
        window.addEventListener('load', agendar);
        computador.addEventListener && computador.addEventListener('change', agendar);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);
        agendar();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();

    window.DicasRolagem = { atualizar: agendar };
})();
