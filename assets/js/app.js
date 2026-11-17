/*
 * ============================================================
 *  app.js — Coisas que funcionam em TODAS as páginas
 * ============================================================
 *  Partes:
 *   1. toast()            — avisos que aparecem no canto da tela
 *   2. api()              — chama os arquivos da pasta api/ (com token de segurança)
 *   3. Menus              — menu do usuário e menu "hambúrguer" do celular
 *   4. Busca inteligente  — sugestões de músicas/artistas enquanto digita
 *   5. Abas               — qualquer elemento com [data-abas] vira um sistema de abas
 *   6. Favoritar          — qualquer botão com [data-favoritar="id"]
 * ============================================================
 */
(function () {
    'use strict';

    // ========== 1. Toasts ==========

    /* Mostra um aviso rápido. tipo: 'sucesso', 'erro' ou 'info'. */
    function toast(mensagem, tipo) {
        const caixa = document.getElementById('toasts');
        if (!caixa) return;
        const el = document.createElement('div');
        el.className = 'toast toast-' + (tipo || 'info');
        el.textContent = mensagem;
        caixa.appendChild(el);
        // AJUSTAR: tempo (ms) que o aviso fica na tela.
        setTimeout(() => el.classList.add('saindo'), 3200);
        setTimeout(() => el.remove(), 3700);
    }
    // Some com os avisos que vieram do PHP (flash) também.
    document.querySelectorAll('#toasts .toast').forEach(el => {
        setTimeout(() => el.classList.add('saindo'), 3800);
        setTimeout(() => el.remove(), 4300);
    });

    // ========== 2. Chamadas da API ==========

    /*
     * Envia "dados" (objeto) para um arquivo da API via POST e devolve a resposta JSON.
     * Se o usuário não estiver logado, mostra o aviso e manda para o login.
     */
    async function api(url, dados) {
        const token = document.querySelector('meta[name="csrf-token"]').content;
        let resposta;
        try {
            const r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                body: JSON.stringify(dados || {}),
            });
            resposta = await r.json();
        } catch (e) {
            toast('Não consegui falar com o servidor.', 'erro');
            throw e;
        }
        if (!resposta.ok) {
            toast(resposta.erro || 'Algo deu errado.', 'erro');
            if (resposta.login) setTimeout(() => { location.href = 'login.php?voltar=' + encodeURIComponent(location.pathname + location.search); }, 900);
            throw new Error(resposta.erro);
        }
        return resposta;
    }

    // ========== 3. Menus ==========

    const avatar = document.getElementById('avatar-botao');
    const suspenso = document.getElementById('menu-suspenso');
    if (avatar && suspenso) {
        avatar.addEventListener('click', (ev) => {
            ev.stopPropagation();
            suspenso.hidden = !suspenso.hidden;
            avatar.setAttribute('aria-expanded', String(!suspenso.hidden));
        });
        document.addEventListener('click', () => { suspenso.hidden = true; });
    }

    const hamburguer = document.getElementById('nav-hamburguer');
    if (hamburguer) {
        hamburguer.addEventListener('click', () => document.getElementById('nav-links').classList.toggle('aberto'));
    }

    // ========== 4. Busca inteligente ==========

    const campo = document.getElementById('campo-busca');
    const lista = document.getElementById('busca-sugestoes');
    let timerBusca = null;
    let selecionado = -1;

    /* Escapa texto antes de colocar em innerHTML. */
    function esc(t) {
        return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* Pede as sugestões ao servidor e monta a lista embaixo do campo. */
    async function buscarSugestoes(termo) {
        try {
            const r = await fetch('api/sugestoes.php?q=' + encodeURIComponent(termo));
            const d = await r.json();
            let html = '';
            if (d.musicas.length) {
                html += '<div class="sug-titulo">Músicas</div>';
                html += d.musicas.map(m => '<a class="sug-item" href="cifra.php?id=' + m.id + '"><i class="fa-solid fa-music"></i><span><b>' + esc(m.titulo) + '</b><small>' + esc(m.artista) + '</small></span></a>').join('');
            }
            if (d.artistas.length) {
                html += '<div class="sug-titulo">Artistas</div>';
                html += d.artistas.map(a => '<a class="sug-item" href="hub.php?artista=' + encodeURIComponent(a.artista) + '"><i class="fa-solid fa-microphone"></i><span><b>' + esc(a.artista) + '</b><small>' + a.total + ' cifra(s)</small></span></a>').join('');
            }
            if (!html) html = '<div class="sug-vazio">Nada encontrado. Aperte Enter para buscar mesmo assim.</div>';
            lista.innerHTML = html;
            lista.hidden = false;
            selecionado = -1;
        } catch (e) { /* busca é só um extra; se falhar, o Enter ainda funciona */ }
    }

    if (campo && lista) {
        campo.addEventListener('input', () => {
            clearTimeout(timerBusca);
            const termo = campo.value.trim();
            if (termo.length < 2) { lista.hidden = true; return; }
            // AJUSTAR: espera (ms) depois de parar de digitar antes de buscar.
            timerBusca = setTimeout(() => buscarSugestoes(termo), 160);
        });
        // Setas para navegar nas sugestões, Enter para abrir, Esc para fechar.
        campo.addEventListener('keydown', (ev) => {
            const itens = lista.querySelectorAll('.sug-item');
            if (lista.hidden || !itens.length) return;
            if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                selecionado = (selecionado + (ev.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
                itens.forEach((it, i) => it.classList.toggle('selecionado', i === selecionado));
            } else if (ev.key === 'Enter' && selecionado >= 0) {
                ev.preventDefault();
                location.href = itens[selecionado].href;
            } else if (ev.key === 'Escape') {
                lista.hidden = true;
            }
        });
        document.addEventListener('click', (ev) => { if (!ev.target.closest('.busca')) lista.hidden = true; });

        // Atalho: "/" em qualquer lugar foca a busca.
        document.addEventListener('keydown', (ev) => {
            if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
                ev.preventDefault();
                campo.focus();
            }
        });
    }

    // ========== 5. Abas ==========
    // Uso no HTML:
    //   <div data-abas>
    //     <button data-aba="cifra">Cifra</button> ...
    //   </div>
    //   <div data-painel="cifra">...</div>
    // A aba aberta fica no endereço (#cifra), então dá para compartilhar o link.

    document.querySelectorAll('[data-abas]').forEach(grupo => {
        const botoes = Array.from(grupo.querySelectorAll('[data-aba]'));
        const escopo = grupo.closest('[data-abas-escopo]') || document;

        /* Abre a aba com o nome dado e esconde as outras. */
        function abrir(nome, atualizarEndereco) {
            if (!botoes.some(b => b.dataset.aba === nome)) return;
            botoes.forEach(b => {
                const ativo = b.dataset.aba === nome;
                b.classList.toggle('ativa', ativo);
                b.setAttribute('aria-selected', String(ativo));
            });
            escopo.querySelectorAll('[data-painel]').forEach(p => { p.hidden = p.dataset.painel !== nome; });
            if (atualizarEndereco) history.replaceState(null, '', '#' + nome);
            document.dispatchEvent(new CustomEvent('aba-aberta', { detail: nome }));
        }

        botoes.forEach((b, i) => {
            b.setAttribute('role', 'tab');
            b.addEventListener('click', () => abrir(b.dataset.aba, true));
            b.addEventListener('keydown', (ev) => {
                if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
                const prox = botoes[(i + (ev.key === 'ArrowRight' ? 1 : -1) + botoes.length) % botoes.length];
                prox.focus();
                abrir(prox.dataset.aba, true);
            });
        });

        const doEndereco = location.hash.slice(1);
        abrir(botoes.some(b => b.dataset.aba === doEndereco) ? doEndereco : botoes[0].dataset.aba, false);
        grupo.abrirAba = abrir;
    });

    // ========== 6. Favoritar ==========

    document.addEventListener('click', async (ev) => {
        const botao = ev.target.closest('[data-favoritar]');
        if (!botao) return;
        ev.preventDefault();
        const r = await api('api/favoritar.php', { musica_id: Number(botao.dataset.favoritar) });
        botao.classList.toggle('favorito', r.favorito);
        const icone = botao.querySelector('i');
        if (icone) icone.className = (r.favorito ? 'fa-solid' : 'fa-regular') + ' fa-heart';
        const contador = botao.querySelector('.fav-total');
        if (contador) contador.textContent = r.total;
        toast(r.favorito ? 'Adicionada às favoritas ❤' : 'Removida das favoritas', 'sucesso');
    });

    // Deixa as funções disponíveis para os outros scripts.
    window.CD = { toast, api, esc };
})();
