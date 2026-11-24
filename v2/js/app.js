/*
 * app.js — Liga tudo: rotas (#/...), barra lateral,
 * instalação como app, backup e funcionamento offline.
 */
(function (global) {
    'use strict';
    const { icone, esc, capaMusica, capaRep, toast, abrirSheet, fecharSheet } = UI;

    /* ---------- Rotas ---------- */
    const ROTAS = [
        [/^\/?$/, 'inicio', 'inicio'],
        [/^\/curtidas$/, 'curtidas', 'biblioteca'],
        [/^\/buscar$/, 'buscar', 'buscar'],
        [/^\/show$/, 'show', 'show'],
        [/^\/biblioteca$/, 'biblioteca', 'biblioteca'],
        [/^\/criar$/, 'criar', 'criar'],
        [/^\/editar\/([\w-]+)$/, 'criar', 'biblioteca'],
        [/^\/config$/, 'config', ''],
        [/^\/cifra\/([\w-]+)$/, 'cifra', ''],
        [/^\/repertorio\/([\w-]+)$/, 'repertorio', 'biblioteca'],
        [/^\/pacotes$/, 'pacotes', 'biblioteca'],   // js/pacotes.js
        [/^\/receber$/, 'receber', 'biblioteca'],   // js/compartilhar.js (QR da banda)
        [/^\/banda$/, 'banda', 'show'],             // js/banda.js (entrar na banda sincronizada)
    ];
    let limpar = null;
    let rotaAtual = '';

    function lerHash() {
        const h = location.hash.replace(/^#/, '') || '/';
        const [caminho, busca] = h.split('?');
        const q = Object.fromEntries(new URLSearchParams(busca || ''));
        return { caminho, q };
    }

    async function navegar(manterRolagem) {
        const { caminho, q } = lerHash();
        let achou = ROTAS.find(([re]) => re.test(caminho));
        if (!achou) { location.replace('#/'); return; }
        const [re, nome, aba] = achou;
        const m = caminho.match(re);
        const params = { id: m[1] };

        fecharSheet();
        document.body.dataset.tela = nome;
        if (limpar) { try { limpar(); } catch (e) { console.error(e); } limpar = null; }
        document.querySelectorAll('#nav a[data-rota]').forEach(a => {
            const ativo = a.dataset.rota === aba;
            a.classList.toggle('ativo', ativo);
            if (ativo) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });

        const y = window.scrollY;
        try {
            const r = await Telas[nome](params, q);
            if (typeof r === 'function') limpar = r;
        } catch (e) {
            console.error(e);
            document.getElementById('tela').innerHTML = '<div class="vazio"><p>Algo deu errado: ' + esc(e.message) + '</p><a class="bt prim" href="#/">Voltar ao início</a></div>';
        }
        if (manterRolagem) window.scrollTo(0, y);
        else if (nome !== 'cifra') window.scrollTo(0, 0);
        rotaAtual = location.hash;
        atualizarLateral();
    }

    /* ---------- Lista de repertórios na barra lateral (computador) ---------- */
    async function atualizarLateral() {
        if (window.innerWidth < 900) return;
        const rs = (await DB.listarRepertorios()).sort((a, b) => (b.abertoEm || 0) - (a.abertoEm || 0));
        document.getElementById('nav-reps').innerHTML = '<div class="nr-tit">Repertórios</div>' +
            '<a href="#/curtidas">' + UI.capaCurtidas('p32') + 'Músicas Curtidas</a>' +
            rs.map(r => '<a href="#/repertorio/' + r.id + '">' + capaRep(r) + esc(r.nome) + '</a>').join('');
    }

    /* ---------- Cliques que valem para todas as telas ---------- */
    document.addEventListener('click', (e) => {
        const t = e.target;
        const menu = t.closest('[data-menu-musica]');
        if (menu) { e.preventDefault(); e.stopPropagation(); Telas.menuMusica(menu.dataset.menuMusica); return; }
        if (t.closest('[data-voltar]')) { e.preventDefault(); if (history.length > 1) history.back(); else location.hash = '#/'; return; }
        if (t.closest('[data-conta]')) { Telas.menuConta(); return; }
        if (t.closest('[data-criar-menu]')) { e.preventDefault(); Telas.menuCriar(); return; }
        const linha = t.closest('[data-href]');
        if (linha && !t.closest('button, a')) { location.hash = linha.dataset.href; }
    });
    document.getElementById('sheet-fundo').addEventListener('click', (e) => { if (e.target.id === 'sheet-fundo') fecharSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharSheet(); });
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-href][role="link"]')) {
            e.preventDefault(); location.hash = e.target.dataset.href;
        }
    });

    /* ---------- Instalar como app ---------- */
    let pedidoInstalar = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); pedidoInstalar = e;
        if (lerHash().caminho === '/' || lerHash().caminho === '') navegar(true);
    });
    window.addEventListener('appinstalled', () => { pedidoInstalar = null; toast('Cifra-Dog instalado!'); });

    /* Vindo do site de download (index.html?instalar=1): abre um painel para instalar o app (PWA).
       O navegador só deixa instalar depois de um toque, por isso o botão. */
    const jaInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    function abrirInstalar() {
        if (jaInstalado()) { toast('O Cifra-Dog já está instalado neste aparelho.'); return; }
        const apple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const passos = apple
            ? 'No iPhone ou iPad, abra esta página no <b>Safari</b>, toque em <b>Compartilhar</b> e escolha <b>Adicionar à Tela de Início</b>.'
            : 'No menu do navegador (⋮), escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.';
        abrirSheet('<h3 style="margin:0 0 6px">Instalar o Cifra-Dog</h3>' +
            '<p class="dica" style="margin:0 0 12px">Vira um aplicativo no seu aparelho: abre em tela cheia, funciona sem internet e guarda tudo no próprio aparelho. Sem loja e sem cadastro.</p>' +
            (pedidoInstalar ? '<button class="bt prim cheio" id="inst-agora">Instalar agora</button>' : '<p>' + passos + '</p>'),
            sh => { const b = sh.querySelector('#inst-agora'); if (b) b.onclick = () => global.App.instalar(); });
    }
    if (new URLSearchParams(location.search).get('instalar') === '1') {
        setTimeout(abrirInstalar, 1200);
        history.replaceState(null, '', location.pathname + location.hash);   // tira o ?instalar=1 do endereço
    }

    /* ---------- Backup ---------- */
    async function exportar() {
        const dados = await DB.exportar();
        const blob = new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' });
        const nome = 'cifradog-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = nome;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        fecharSheet(); toast('Backup exportado: ' + dados.musicas.length + ' cifras');
    }
    function importar() {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = async () => {
            const f = inp.files[0]; if (!f) return;
            try {
                FiltroJson.zerarRelatorio();
                const r = await DB.importar(await FiltroJson.lerArquivo(f));
                fecharSheet(); toast('Backup juntado: ' + r.novas + ' novas, ' + r.atualizadas + ' atualizadas, ' + r.repertorios + ' repertórios' + FiltroJson.resumo());
                navegar(true);
            } catch (e) { toast(e.message || 'Não consegui ler esse arquivo de backup'); }
        };
        inp.click();
    }

    global.App = {
        recarregar: () => navegar(true),
        podeInstalar: () => !!pedidoInstalar,
        async instalar() {
            if (!pedidoInstalar) { toast('Use o menu do navegador: "Instalar app" / "Adicionar à tela inicial"'); return; }
            fecharSheet(); pedidoInstalar.prompt();
            await pedidoInstalar.userChoice; pedidoInstalar = null; navegar(true);
        },
        exportar, importar,
    };

    /* ---------- Início ---------- */
    async function iniciar() {
        try { await Exemplos.semearSePreciso(); }
        catch (e) { console.error(e); toast('Seu navegador bloqueou o armazenamento local'); }
        try { Controle.iniciar(); } catch (e) { console.warn('Controle:', e); }
        window.addEventListener('hashchange', () => { if (location.hash !== rotaAtual) navegar(false); });
        let lateralVisivel = window.innerWidth >= 900;
        window.addEventListener('resize', () => {
            const visivel = window.innerWidth >= 900;
            if (visivel && !lateralVisivel) atualizarLateral();
            lateralVisivel = visivel;
        });
        navegar(false);
        // Offline: o service worker só funciona em http(s)/localhost (não em file://)
        if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
            // Quando sai uma versão nova, o app se atualiza sozinho: recarrega uma vez (ou na próxima troca de tela, se uma cifra estiver aberta).
            const jaTinhaControle = !!navigator.serviceWorker.controller;
            let atualizando = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!jaTinhaControle || atualizando) return;
                atualizando = true;
                if (/^#\/cifra/.test(location.hash)) window.addEventListener('hashchange', () => location.reload(), { once: true });
                else location.reload();
            });
            navigator.serviceWorker.register('sw.js').then(reg => {
                reg.update();
                document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
            }).catch(e => console.warn('SW:', e));
        }
    }
    iniciar();
})(window);
