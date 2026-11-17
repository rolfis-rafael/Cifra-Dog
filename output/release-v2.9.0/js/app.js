/*
 * app.js — Liga tudo: rotas (#/...), mini-player, barra lateral,
 * instalação como app, backup e funcionamento offline.
 */
(function (global) {
    'use strict';
    const { icone, esc, capaMusica, capaRep, toast, fecharSheet } = UI;

    /* ---------- Rotas ---------- */
    const ROTAS = [
        [/^\/?$/, 'inicio', 'inicio'],
        [/^\/curtidas$/, 'curtidas', 'biblioteca'],
        [/^\/buscar$/, 'buscar', 'buscar'],
        [/^\/show$/, 'show', 'show'],
        [/^\/biblioteca$/, 'biblioteca', 'biblioteca'],
        [/^\/criar$/, 'criar', 'criar'],
        [/^\/editar\/([\w-]+)$/, 'criar', 'criar'],
        [/^\/config$/, 'config', ''],
        [/^\/cifra\/([\w-]+)$/, 'cifra', ''],
        [/^\/repertorio\/([\w-]+)$/, 'repertorio', 'biblioteca'],
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
        atualizarMini(nome);
        atualizarLateral();
    }

    /* ---------- Mini-player (última cifra aberta) ---------- */
    async function atualizarMini(nomeTela) {
        const mini = document.getElementById('mini');
        const u = await DB.lerMeta('ultima');
        const m = u ? await DB.pegarMusica(u.id) : null;
        const mostrar = !!m && nomeTela !== 'cifra' && nomeTela !== 'criar';
        mini.hidden = !mostrar;
        document.body.classList.toggle('sem-mini', !mostrar);
        if (!mostrar) return;
        const rep = u.rep ? await DB.pegarRepertorio(u.rep) : null;
        const link = '#/cifra/' + m.id + (rep ? '?rep=' + rep.id + '&i=' + u.i : '');
        mini.innerHTML = capaMusica(m) +
            '<a class="mini-txt" href="' + link + '"><div class="mini-tit">' + esc(m.titulo) + (m.artista ? ' · ' + esc(m.artista) : '') + '</div>' +
            '<div class="mini-sub">' + (rep ? esc(rep.nome) : 'Continuar tocando') + '</div></a>' +
            '<a class="mini-bt" href="' + link + (rep ? '&' : '?') + 'rolar=1" aria-label="Tocar com rolagem">' + icone('play') + '</a>';
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
                const r = await DB.importar(JSON.parse(await f.text()));
                fecharSheet(); toast('Backup juntado: ' + r.novas + ' novas, ' + r.atualizadas + ' atualizadas, ' + r.repertorios + ' repertórios');
                navegar(true);
            } catch (e) { toast('Não consegui ler esse arquivo de backup'); }
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
        try { await Exemplos.semearSePreciso(); await ListaVideo.importarSePreciso(); }
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
            navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW:', e));
        }
    }
    iniciar();
})(window);
