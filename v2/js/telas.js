/*
 * telas.js — Todas as telas do Cifra-Dog.
 * Cada tela recebe (params, query) e desenha dentro de #tela.
 * Se a tela precisar "limpar" algo ao sair (rolagem, wake lock), devolve uma função de limpeza.
 */
(function (global) {
    'use strict';
    const { icone, esc, normal, capaMusica, capaRep, capaCurtidas, tomAtual, toast,
        abrirSheet, fecharSheet, perguntar, confirmar, prefs, salvarPrefs, tempoAtras } = UI;
    const tela = () => document.getElementById('tela');
    const ir = (hash) => { location.hash = hash; };

    /* =================================================================
       Peças compartilhadas
       ================================================================= */

    /* Uma linha de música (usada em listas). */
    function linhaMusica(m, extra) {
        return '<div class="linha" role="link" tabindex="0" data-href="#/cifra/' + m.id + '">' +
            capaMusica(m) +
            '<div class="l-txt"><div class="l-tit">' + esc(m.titulo) + '</div>' +
            '<div class="l-sub">' + (m.curtida ? '<span class="coracao-on" style="display:flex">' + icone('coracao', ' style="width:14px;height:14px"') + '</span>' : '') +
            '<span class="badge">' + esc(tomAtual(m)) + '</span>' + ((m.cifra || '').trim() ? '' : '<span class="badge sem-cifra">sem cifra</span>') + esc(m.artista || 'Cifra') + (extra || '') + '</div></div>' +
            '<button class="bt-icone" data-menu-musica="' + m.id + '" aria-label="Opções">' + icone('pontos') + '</button></div>';
    }
    function linhaRep(r) {
        const n = r.itens.filter(i => i.tipo === 'musica').length;
        return '<div class="linha" role="link" tabindex="0" data-href="#/repertorio/' + r.id + '">' + capaRep(r) +
            '<div class="l-txt"><div class="l-tit">' + esc(r.nome) + '</div><div class="l-sub">Repertório · ' + n + ' música' + (n === 1 ? '' : 's') + '</div></div></div>';
    }
    async function linhaCurtidas() {
        const n = (await DB.listarMusicas()).filter(m => m.curtida).length;
        return '<div class="linha" role="link" tabindex="0" data-href="#/curtidas">' + capaCurtidas() +
            '<div class="l-txt"><div class="l-tit">Músicas Curtidas</div><div class="l-sub">Lista · ' + n + ' música' + (n === 1 ? '' : 's') + '</div></div></div>';
    }

    /* Menu "⋯" de uma música. */
    async function menuMusica(id) {
        const m = await DB.pegarMusica(id);
        if (!m) return;
        abrirSheet(
            '<div class="sh-cab">' + capaMusica(m) + '<div><div class="sh-tit">' + esc(m.titulo) + '</div><div class="sh-sub">' + esc(m.artista || 'Cifra') + '</div></div></div>' +
            '<button class="op" data-a="curtir">' + icone(m.curtida ? 'coracao' : 'coracaoVazio') + (m.curtida ? 'Remover das Curtidas' : 'Curtir') + '</button>' +
            '<button class="op" data-a="rep">' + icone('lista') + 'Adicionar ao repertório</button>' +
            '<button class="op" data-a="editar">' + icone('lapis') + 'Editar cifra</button>' +
            '<button class="op perigo" data-a="excluir">' + icone('lixeira') + 'Excluir cifra</button>',
            sh => sh.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
                const a = b.dataset.a;
                if (a === 'curtir') { await DB.atualizarMusica(id, { curtida: !m.curtida }); fecharSheet(); toast(m.curtida ? 'Removida das Curtidas' : 'Adicionada às Curtidas'); App.recarregar(); }
                if (a === 'rep') adicionarAoRepertorio(id);
                if (a === 'editar') { fecharSheet(); ir('#/editar/' + id); }
                if (a === 'excluir') {
                    if (await confirmar('Excluir "' + m.titulo + '"?', 'Ela também sai dos repertórios. Dá para desfazer logo depois.', 'Excluir')) {
                        const copiaM = JSON.parse(JSON.stringify(m)), repsAntes = JSON.parse(JSON.stringify(await DB.listarRepertorios()));
                        await DB.excluirMusica(id); UI.toastAcao('Cifra excluída', 'Desfazer', () => desfazerMusica(copiaM, repsAntes));
                        if (location.hash.includes(id)) history.back(); else App.recarregar();
                    }
                }
            })
        );
    }

    /* Escolher repertório para colocar uma música. */
    async function adicionarAoRepertorio(musicaId) {
        const reps = (await DB.listarRepertorios()).sort((a, b) => (b.abertoEm || 0) - (a.abertoEm || 0));
        abrirSheet(
            '<h3 style="margin:0 0 8px">Adicionar ao repertório</h3>' +
            '<button class="op" data-novo>' + icone('mais') + '<b>Novo repertório</b></button>' +
            reps.map(r => {
                const tem = r.itens.some(i => i.musicaId === musicaId);
                return '<button class="op" data-rep="' + r.id + '">' + capaRep(r, 'p40') +
                    esc(r.nome) + '<span class="op-dir">' + (tem ? icone('check', ' style="color:var(--verm-claro)"') : '') + '</span></button>';
            }).join(''),
            sh => {
                sh.querySelector('[data-novo]').onclick = async () => {
                    const nome = await perguntar('Nome do repertório', '', 'Criar');
                    if (!nome) return;
                    await DB.salvarRepertorio({ nome, itens: [{ id: DB.novoId(), tipo: 'musica', musicaId, semitons: 0 }] });
                    toast('Adicionada a "' + nome + '"'); App.recarregar();
                };
                sh.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => {
                    const r = await DB.pegarRepertorio(b.dataset.rep);
                    if (r.itens.some(i => i.musicaId === musicaId)) { toast('Já está em "' + r.nome + '"'); return; }
                    r.itens.push({ id: DB.novoId(), tipo: 'musica', musicaId, semitons: 0 });
                    await DB.salvarRepertorio(r); fecharSheet(); toast('Adicionada a "' + r.nome + '"'); App.recarregar();
                });
            }
        );
    }

    async function novoRepertorio() {
        const nome = await perguntar('Nome do repertório', '', 'Criar');
        if (!nome) return;
        const r = await DB.salvarRepertorio({ nome });
        ir('#/repertorio/' + r.id);
    }

    function menuCriar() {
        abrirSheet('<h3 style="margin:0 0 8px">Criar</h3>' +
            '<a class="op" href="#/criar">' + icone('mais') + 'Nova cifra</a>' +
            '<button class="op" data-sh-rep>' + icone('lista') + 'Novo repertório</button>',
            sh => {
                sh.querySelector('a').onclick = fecharSheet;
                sh.querySelector('[data-sh-rep]').onclick = () => { fecharSheet(); novoRepertorio(); };
            });
    }

    /* Desfazer exclusão: devolve a cifra (e a vaga dela nos repertórios) ou o repertório, e tira a marca de "excluído" do histórico de segurança. */
    async function tirarMarcaExclusao(chave) {
        const ex = (await DB.lerMeta('exclusoes-sala')) || {};
        if (ex[chave]) { delete ex[chave]; await DB.gravarMeta('exclusoes-sala', ex); }
    }
    async function desfazerMusica(m, repsAntes) {
        await DB.salvarMusica(m);
        for (const r of repsAntes) if (r.ordens.some(o => o.itens.some(i => i.musicaId === m.id))) await DB.salvarRepertorio(r);
        await tirarMarcaExclusao(m.id);
        toast('Cifra restaurada'); App.recarregar();
    }
    async function desfazerRepertorio(r) {
        await DB.salvarRepertorio(r); await tirarMarcaExclusao('rep:' + r.id);
        toast('Repertório restaurado'); ir('#/repertorio/' + r.id);
    }

    function baixarRepertorios() {
        // Botão de destaque: é por aqui que a pessoa traz repertórios novos (estilo em css/dicas.css, bloco 5).
        return '<a class="bt prim cheio bt-baixar" href="baixar.html#repertorios">' + icone('baixar') + '<span class="bb-txt"><b>Baixar repertórios</b><small>Pacotes de cifras prontos para importar</small></span></a>';
    }

    /* Menu do avatar: backup e instalar. */
    function menuConta() {
        abrirSheet(
            '<div style="text-align:center;padding:4px 0 10px"><img src="img/brand/logo-pub.webp" decoding="async" alt="Cifra-Dog" style="width:240px;max-width:85%"></div>' +
            '<button class="op" data-a="config">' + icone('ajustes') + 'Configurações (pedal e MIDI)</button>' +
            '<button class="op" data-a="sala">' + icone('violao') + 'Estudo, palco e segurança</button>' +
            '<button class="op" data-a="exportar">' + icone('baixar') + 'Exportar backup (.json)</button>' +
            '<button class="op" data-a="importar">' + icone('subir') + 'Importar backup</button>' +
            '<p class="dica" style="margin:10px 4px 0">As cifras ficam salvas neste aparelho. Use o backup para passar do celular para o computador (ou o contrário).</p>',
            sh => sh.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
                const a = b.dataset.a;
                if (a === 'config') { fecharSheet(); ir('#/config'); }
                if (a === 'sala') { fecharSheet(); Sala.abrir(); }
                if (a === 'exportar') App.exportar();
                if (a === 'importar') App.importar();
            })
        );
    }

    function barraTopo(titulo, direita) {
        return '<div class="topo"><button class="avatar" data-conta style="background-image:url(img/brand/dog-pub.webp)" aria-label="Menu"></button>' +
            '<h1 class="titulo" style="margin:0;flex:1;font-size:22px">' + esc(titulo) + '</h1>' + (direita || '') + '</div>';
    }

    function abertura(arte, etiqueta, titulo, texto) {
        return '<div class="page-intro"><div aria-hidden="true" class="intro-art capa arte-' + arte + '"></div>' +
            '<div class="intro-copy"><span class="eyebrow">' + esc(etiqueta) + '</span><h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p></div></div>';
    }

    /* =================================================================
       INÍCIO (estilo Spotify)
       ================================================================= */
    const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const DIAS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
    const BANNERS = [
        { tag: 'Novo', icone: 'ajustes', titulo: 'Pedal e MIDI do seu jeito', texto: 'Parar, travar (segure o botão) e descer lisinho com o Chocolate Plus.', link: '#/config' },
        { tag: 'Novo', icone: 'pinca', titulo: 'Pinça para ajustar a letra', texto: 'Dois dedos mudam o tamanho; a rolagem acompanha e a letra sempre cabe na tela.', link: '#/show' },
        { tag: 'Dica', icone: 'bloco', titulo: 'Blocos e várias ordens', texto: 'Divida o show em blocos e guarde mais de uma ordem para o mesmo repertório.', link: '#/biblioteca?aba=repertorios' },
        { tag: 'Dica', icone: 'relogio', titulo: 'Rolagem por BPM', texto: 'A frase marcada acompanha o tempo da música. Ligue nos ajustes da cifra.', link: '#/biblioteca?aba=cifras' },
    ];
    function rotuloPapel(t) { return '<h2 class="secao"><span class="papel">' + esc(t) + '</span></h2>'; }

    async function inicio(p, q) {
        const filtro = q.f || 'tudo';
        const [ms, rs, ultima, bvVisto] = await Promise.all([DB.listarMusicas(), DB.listarRepertorios(), DB.lerMeta('ultima'), DB.lerMeta('boas-vindas-v1')]);
        const chips = [['tudo', 'Tudo'], ['cifras', 'Cifras'], ['repertorios', 'Repertórios'], ['curtidas', 'Curtidas']];
        let h = '<div class="topo"><button class="avatar" data-conta style="background-image:url(img/brand/dog-pub.webp)" aria-label="Menu"></button>' +
            '<div class="chips">' + chips.map(([k, t]) => '<a class="chip ' + (k === filtro ? 'ativo' : '') + '" href="#/?f=' + k + '">' + t + '</a>').join('') + '</div></div>';

        if (filtro === 'tudo') {
            const hoje = new Date();
            const saudacao = ['Domingão de violão', 'Hora do ensaio', 'Hora do ensaio', 'Hora do ensaio', 'Hora do ensaio', 'Sextou!', 'Dia de palco!'][hoje.getDay()];
            h += '<header class="home-welcome"><span class="eyebrow">Seu canto. Sua música.</span><h1>O palco é seu.</h1><p>Escolha uma cifra, afine o violão e fique à vontade.</p><img class="home-dog" src="img/brand/dog-pub.webp" width="145" height="160" decoding="async" alt="Dog de bandana com sua guitarra"></header>';
            // Grade de atalhos: Curtidas + o que foi aberto por último.
            const recentes = [
                ...rs.map(r => ({ t: r.abertoEm || r.criadoEm, html: '<a class="atalho" href="#/repertorio/' + r.id + '">' + capaRep(r) + '<span>' + esc(r.nome) + '</span></a>' })),
                ...ms.map(m => ({ t: m.abertaEm || 0, html: '<a class="atalho" href="#/cifra/' + m.id + '">' + capaMusica(m) + '<span>' + esc(m.titulo) + '</span></a>' })),
            ].sort((a, b) => b.t - a.t).slice(0, 7);
            h += '<div class="grade"><a class="atalho" href="#/curtidas">' + capaCurtidas() + '<span>Músicas Curtidas</span></a>' + recentes.map(x => x.html).join('') + '</div>';
            // Primeira vez: 3 passos curtos (some ao tocar em "Entendi"; só aparece para quem ainda não tem cifras próprias).
            if (!bvVisto && ms.every(m => m.exemplo)) {
                h += '<section class="boas-vindas"><b>Bem-vindo ao Cifra-Dog!</b><ol>' +
                    '<li><a href="baixar.html#repertorios">Baixe um repertório</a> pronto e importe aqui;</li>' +
                    '<li>ou <a href="#/criar">cole uma cifra</a> sua: o app separa acordes e letra sozinho;</li>' +
                    '<li>na aba <a href="#/show">Show</a>, toque no ▶ para tocar com a cifra descendo na tela.</li></ol>' +
                    '<button class="bt" data-bv-fechar>Entendi</button></section>';
            }
            h += '<div class="dupla" style="margin-top:12px">' + baixarRepertorios() + '</div>';

            // "Ingresso" do show: o repertório aberto por último
            const repShow = rs.slice().sort((a, b) => (b.abertoEm || 0) - (a.abertoEm || 0))[0];
            if (repShow) {
                const mus = repShow.itens.filter(i => i.tipo === 'musica');
                const nBlocos = repShow.itens.filter(i => i.tipo === 'bloco').length;
                const cont = ultima && ultima.rep === repShow.id && mus[ultima.i] ? ultima.i : 0;
                const alvo = mus[cont];
                h += rotuloPapel(saudacao) + '<div class="ingresso"><div class="ing-data"><small>' + MESES[hoje.getMonth()] + '</small><b>' + hoje.getDate() + '</b></div>' +
                    '<div class="ing-capa">' + capaRep(repShow) + '</div>' +
                    '<div class="ing-corpo"><div class="ing-quando">' + DIAS[hoje.getDay()] + ' • hoje</div><div class="ing-tit">' + esc(repShow.nome) + '</div>' +
                    '<div class="ing-sub">' + mus.length + ' música' + (mus.length === 1 ? '' : 's') + (nBlocos ? ' · ' + nBlocos + ' bloco' + (nBlocos === 1 ? '' : 's') : '') + '</div>' +
                    (alvo ? '<a class="ing-bt" href="#/cifra/' + alvo.musicaId + '?rep=' + repShow.id + '&i=' + cont + '">' + icone('play') + (cont ? 'Continuar do nº ' + (cont + 1) : 'Entrar no show') + '</a>' : '<a class="ing-bt" href="#/repertorio/' + repShow.id + '">' + icone('mais') + 'Montar o show</a>') +
                    '</div></div>';
            }

            const tocadas = ms.filter(m => m.abertaEm).sort((a, b) => b.abertaEm - a.abertaEm).slice(0, 12);
            if (tocadas.length) h += secaoCarrossel('Tocadas recentemente', tocadas.map(cartaoMusica));
            if (rs.length) h += secaoCarrossel('Seus repertórios', rs.sort((a, b) => (b.abertoEm || 0) - (a.abertoEm || 0)).map(cartaoRep), '#/biblioteca?aba=repertorios');

            // Navegar por tom
            const porTom = {};
            ms.forEach(m => { const t = tomAtual(m); if (t && t !== '♪') porTom[t] = (porTom[t] || 0) + 1; });
            const tons = Object.keys(porTom).sort();
            if (tons.length) h += rotuloPapel('Escolha pelo tom') + '<div class="chips tons">' + tons.map(t => '<a class="chip" href="#/buscar?tom=' + encodeURIComponent(t) + '">' + esc(t) + ' <small>' + porTom[t] + '</small></a>').join('') + '</div>';

            const mais = ms.filter(m => m.tocadas > 0).sort((a, b) => b.tocadas - a.tocadas).slice(0, 12);
            if (mais.length > 2) h += secaoCarrossel('Mais tocadas', mais.map(cartaoMusica));
            const exemplos = ms.filter(m => m.exemplo).sort((a, b) => b.criadaEm - a.criadaEm);
            if (exemplos.length) h += secaoCarrossel('Músicas de exemplo', exemplos.map(cartaoMusica));
            const novas = ms.filter(m => !m.exemplo).sort((a, b) => b.criadaEm - a.criadaEm).slice(0, 12);
            if (novas.length) h += secaoCarrossel('Adicionadas por você', novas.map(cartaoMusica), '#/biblioteca?aba=cifras');
            if (!ms.length) h += vazio('Nenhuma cifra ainda', 'Adicione a primeira cifra');
            h += rotuloPapel('Nos bastidores') + '<div class="banners">' + BANNERS.map(b =>
                '<a class="banner" href="' + b.link + '"><div class="bn-selo">' + icone(b.icone) + '</div><div class="bn-txt"><small>' + esc(b.tag) + '</small><b>' + esc(b.titulo) + '</b><span>' + esc(b.texto) + '</span></div></a>').join('') + '</div>';
        } else if (filtro === 'cifras') {
            h += ms.length ? '<div class="lista">' + ms.sort((a, b) => (b.abertaEm || b.criadaEm) - (a.abertaEm || a.criadaEm)).map(m => linhaMusica(m)).join('') + '</div>' : vazio('Nenhuma cifra ainda', 'Adicionar cifra');
        } else if (filtro === 'repertorios') {
            h += '<button class="linha" data-novo-rep style="width:100%;text-align:left"><div class="capa" style="width:48px;height:48px;border-radius:4px;--c1:#2a2a2a;--c2:#2a2a2a">' + icone('mais') + '</div><div class="l-txt"><div class="l-tit">Novo repertório</div></div></button>';
            h += '<div class="lista">' + rs.map(linhaRep).join('') + '</div>';
        } else if (filtro === 'curtidas') {
            const c = ms.filter(m => m.curtida);
            h += c.length ? '<div class="lista">' + c.map(m => linhaMusica(m)).join('') + '</div>' : '<div class="vazio">Toque no ♡ de uma cifra para ela aparecer aqui.</div>';
        }
        tela().innerHTML = h;
        const nr = tela().querySelector('[data-novo-rep]'); if (nr) nr.onclick = novoRepertorio;
        const bv = tela().querySelector('[data-bv-fechar]'); if (bv) bv.onclick = async () => { await DB.gravarMeta('boas-vindas-v1', true); bv.closest('.boas-vindas').remove(); };
    }

    function secaoCarrossel(titulo, cartoes, link) {
        return '<h2 class="secao"><span class="papel">' + esc(titulo) + '</span>' + (link ? '<a href="' + link + '">Mostrar tudo</a>' : '') + '</h2><div class="carrossel">' + cartoes.join('') + '</div>';
    }
    function cartaoMusica(m) {
        return '<a class="cartao" href="#/cifra/' + m.id + '">' + capaMusica(m) + '<div class="c-tit">' + esc(m.titulo) + '</div><div class="c-sub">' + esc(m.artista || 'Cifra') + '</div></a>';
    }
    function cartaoRep(r) {
        const n = r.itens.filter(i => i.tipo === 'musica').length;
        return '<a class="cartao" href="#/repertorio/' + r.id + '">' + capaRep(r) + '<div class="c-tit">' + esc(r.nome) + '</div><div class="c-sub">' + n + ' música' + (n === 1 ? '' : 's') + '</div></a>';
    }
    function vazio(texto, botao) {
        return '<div class="vazio"><img src="img/brand/dog-pub.webp" width="110" height="110" decoding="async" alt=""><p>' + esc(texto) + '</p><a class="bt prim" href="#/criar">' + icone('mais') + esc(botao) + '</a></div>';
    }

    /* =================================================================
       SHOW — tudo para a hora de tocar: continuar, pedal e busca nos repertórios
       ================================================================= */
    async function show() {
        const [ms, rs, ultima] = await Promise.all([DB.listarMusicas(), DB.listarRepertorios(), DB.lerMeta('ultima')]);
        const porId = Object.fromEntries(ms.map(m => [m.id, m]));
        const reps = rs.slice().sort((a, b) => (b.abertoEm || 0) - (a.abertoEm || 0));
        const e = Controle.estado, c = Controle.cfg();
        const musDe = (r) => r.itens.filter(i => i.tipo === 'musica' && porId[i.musicaId]);
        const linkShow = (r, k) => { const mu = musDe(r)[k]; return mu ? '#/cifra/' + mu.musicaId + '?rep=' + r.id + '&i=' + k : '#/repertorio/' + r.id; };
        const contRep = ultima && ultima.rep ? rs.find(r => r.id === ultima.rep) : null;
        const contMus = contRep && porId[ultima.id] ? porId[ultima.id] : null;

        tela().innerHTML = barraTopo('Show') +
            abertura(3, 'Da passagem de som ao bis', 'Pronto para o palco?', 'Seus repertórios, a próxima música e o pedal. Tudo à mão na hora de tocar.') +
            (contMus ? '<a class="ingresso continuar" href="' + linkShow(contRep, ultima.i) + '"><div class="ing-data"><small>nº</small><b>' + (ultima.i + 1) + '</b></div>' +
                '<div class="ing-corpo"><div class="ing-quando">Continuar de onde parou</div><div class="ing-tit">' + esc(contMus.titulo) + '</div><div class="ing-sub">' + esc(contRep.nome) + '</div></div>' +
                '<span class="ing-bt">' + icone('play') + 'Continuar</span></a>' : '') +
            '<label class="campo-busca">' + icone('busca') + '<input id="sh-busca" type="search" placeholder="Pesquisar música nos repertórios" autocomplete="off"></label>' +
            '<div id="sh-res"></div>' +
            '<div id="sh-reps">' + rotuloPapel('Seus shows') + '<div class="dupla" style="margin-bottom:12px">' + baixarRepertorios() + '</div>' +
            (reps.length ? reps.map(r => {
                const n = musDe(r).length, nb = r.itens.filter(i => i.tipo === 'bloco').length;
                return '<div class="show-cartao">' + capaRep(r) + '<div class="sc-txt"><b>' + esc(r.nome) + '</b><small>' + n + ' música' + (n === 1 ? '' : 's') + (nb ? ' · ' + nb + ' blocos' : '') + '</small></div>' +
                    '<a class="bt-icone" href="#/repertorio/' + r.id + '" aria-label="Abrir repertório">' + icone('lista') + '</a>' +
                    '<a class="bt-play" href="' + linkShow(r, 0) + '" aria-label="Entrar no show">' + icone('play') + '</a></div>';
            }).join('') : '<div class="vazio"><p>Crie um repertório para montar seu show.</p><a class="bt prim" href="#/biblioteca?aba=repertorios">' + icone('mais') + 'Ir para a Discografia</a></div>') + '</div>' +
            rotuloPapel('Pedal') +
            '<div class="cartao-cfg" style="padding:12px"><div class="ajuste" style="padding:2px 0"><span><b>' + (e.ligado ? 'MIDI ligado' : 'MIDI desligado') + '</b><br><small class="dica">' +
            (e.ligado ? (e.entradas.length ? esc(e.entradas.join(', ')) : 'Nenhum controlador encontrado') : 'Teclas e pedal em modo teclado funcionam mesmo assim') + '</small></span>' +
            '<a class="chip" href="#/config">Configurar</a></div>' +
            '<p class="dica" style="margin:8px 0 0">Pedal: descer / subir a tela, iniciar, parar e música seguinte. ' + (c.segurarTrava ? 'Segure o botão de rolagem por ' + (Math.round((c.segurarMs || 700) / 100) / 10).toString().replace('.', ',') + ' s para travar a rolagem.' : '') + ' Na cifra, abra dois dedos (pinça) para aumentar a letra.</p></div>';

        const inp = document.getElementById('sh-busca'), res = document.getElementById('sh-res');
        inp.oninput = () => {
            const termo = normal(inp.value.trim());
            document.getElementById('sh-reps').hidden = !!termo;
            if (!termo) { res.innerHTML = ''; return; }
            const achados = [];
            rs.forEach(r => musDe(r).forEach((it, k) => {
                const m = porId[it.musicaId];
                if (normal((k + 1) + ' ' + m.titulo + ' ' + m.artista).includes(termo)) achados.push({ r, m, k });
            }));
            res.innerHTML = achados.length ? '<div class="lista">' + achados.slice(0, 60).map(x =>
                '<div class="linha" data-href="' + linkShow(x.r, x.k) + '">' + capaMusica(x.m) + '<div class="l-txt"><div class="l-tit">' + esc(x.m.titulo) + '</div>' +
                '<div class="l-sub"><span class="badge">' + (x.k + 1) + '</span>' + esc(x.r.nome) + ' · ' + esc(x.m.artista || 'Cifra') + '</div></div></div>').join('') + '</div>'
                : '<div class="vazio"><p>Nenhuma música dos repertórios combina com "' + esc(inp.value) + '".</p></div>';
        };
        inp.onkeydown = (ev) => { if (ev.key === 'Enter') { const p1 = res.querySelector('[data-href]'); if (p1) location.hash = p1.dataset.href; } };
    }

    /* =================================================================
       CURTIDAS
       ================================================================= */
    async function curtidas() {
        const c = (await DB.listarMusicas()).filter(m => m.curtida).sort((a, b) => (b.abertaEm || 0) - (a.abertaEm || 0));
        tela().innerHTML =
            '<div class="rep-cabeca" style="--c1:#8a1018"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button>' +
            capaCurtidas() + '<h1>Músicas Curtidas</h1><div class="rep-sub">' + c.length + ' música' + (c.length === 1 ? '' : 's') + '</div></div>' +
            (c.length ? '<div class="lista" style="margin-top:8px">' + c.map(m => linhaMusica(m)).join('') + '</div>' : '<div class="vazio">Toque no ♡ de uma cifra para ela aparecer aqui.</div>');
    }

    /* =================================================================
       BUSCAR
       ================================================================= */
    async function buscar(p, q) {
        const ms = await DB.listarMusicas();
        // Índice desta tela: normalização e acordes são reaproveitados ao digitar.
        const indice = ms.map(m => ({ m, titulo: normal(m.titulo), artista: normal(m.artista), tom: tomAtual(m), generos: Catalogo.generosDe(m), letra: null, acordes: null }));
        const porGenero = Object.fromEntries(Catalogo.generos.map(g => [g.id, 0]));
        indice.forEach(x => x.generos.forEach(g => { if (g in porGenero) porGenero[g]++; }));
        const tons = [...new Set(indice.map(x => x.tom).filter(t => t && t !== '♪'))].sort();
        if (q.tom && !tons.includes(q.tom)) tons.push(q.tom);
        const generoInicial = Catalogo.generos.some(g => g.id === q.genero) ? q.genero : '';
        tela().innerHTML = barraTopo('Pesquisar') +
            abertura(1, 'Um dog para cada som', 'Encontre sua próxima música.', 'Do rock ao sertanejo, explore sua coleção por estilo. Combine a busca com o filtro de tom.') +
            '<label class="campo-busca">' + icone('busca') + '<input id="busca" aria-label="Pesquisar música" type="search" placeholder="Música, artista, trecho da letra ou acorde" value="' + esc(q.q || '') + '" autocomplete="off"></label>' +
            '<div class="filtros-musica"><label for="filtro-tom">Tom <select id="filtro-tom" class="entrada"><option value="">Todos os tons</option>' + tons.map(t => '<option value="' + esc(t) + '"' + (t === q.tom ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label><button class="chip contorno" id="limpar-filtros">Limpar filtros</button></div>' +
            '<div class="chips generos-abas" aria-label="Gêneros musicais"><button class="chip" data-genero="">Todos</button>' + Catalogo.generos.map(g => '<button class="chip" data-genero="' + g.id + '">' + g.nome + '</button>').join('') + '</div>' +
            '<div id="resultado"></div>';
        const inp = document.getElementById('busca');
        const res = document.getElementById('resultado');
        const selectTom = document.getElementById('filtro-tom');
        const abas = tela().querySelectorAll('[data-genero]');
        let genero = generoInicial;

        function desenhar() {
            const termo = normal(inp.value.trim());
            const tomFiltro = selectTom.value;
            abas.forEach(b => { const ativo = b.dataset.genero === genero; b.classList.toggle('ativo', ativo); b.setAttribute('aria-pressed', String(ativo)); });
            if (!termo && !tomFiltro && !genero) {
                res.innerHTML = rotuloPapel('Qual é a sua vibe?') + '<div class="grade-generos">' + Catalogo.generos.map(g => {
                    const n = porGenero[g.id];
                    return '<a class="genero-cartao" href="#/buscar?genero=' + g.id + '"><div class="genero-arte genero-' + g.arte + '" aria-hidden="true"></div><div class="genero-legenda"><b>' + g.nome + '</b><small class="genero-var">' + g.variacoes + '</small><small>' + n + ' música' + (n === 1 ? '' : 's') + ' na coleção</small></div></a>';
                }).join('') + '</div>';
                return;
            }
            let lista = indice;
            if (genero) lista = lista.filter(x => x.generos.includes(genero));
            if (tomFiltro) lista = lista.filter(x => x.tom === tomFiltro);
            if (termo) {
                const pareceAcorde = CifraMotor.ehAcorde(inp.value.trim());
                const acordeBuscado = inp.value.trim();
                lista = lista.map(x => {
                    let pontos = 0;
                    if (x.titulo.includes(termo)) pontos += 3;
                    if (x.artista.includes(termo)) pontos += 2;
                    if (pareceAcorde && (x.acordes || (x.acordes = new Set(CifraMotor.listarAcordes(x.m.cifra)))).has(acordeBuscado)) pontos += 2;
                    else {
                        if (x.letra === null) x.letra = normal(x.m.cifra);
                        if (x.letra.includes(termo)) pontos += 1;
                    }
                    return { x, pontos };
                }).filter(item => item.pontos).sort((a, b) => b.pontos - a.pontos).map(item => item.x);
            }
            res.innerHTML = '<p class="dica resultado-resumo">' + lista.length + ' música' + (lista.length === 1 ? '' : 's') + (genero ? ' · ' + esc(Catalogo.nome(genero)) : '') + (tomFiltro ? ' · Tom ' + esc(tomFiltro) : '') + '</p>' +
                (lista.length ? '<div class="lista">' + lista.map(x => linhaMusica(x.m)).join('') + '</div>'
                    : '<div class="vazio"><p>Nenhuma música combina com esses filtros.</p><a class="bt prim" href="#/criar">' + icone('mais') + 'Adicionar cifra</a></div>');
        }
        function atualizar() {
            const params = new URLSearchParams();
            if (inp.value.trim()) params.set('q', inp.value.trim());
            if (genero) params.set('genero', genero);
            if (selectTom.value) params.set('tom', selectTom.value);
            history.replaceState(null, '', '#/buscar' + (params.size ? '?' + params : ''));
            desenhar();
        }
        inp.oninput = atualizar; selectTom.onchange = atualizar;
        abas.forEach(b => b.onclick = () => { genero = b.dataset.genero; atualizar(); });
        document.getElementById('limpar-filtros').onclick = () => { inp.value = ''; selectTom.value = ''; genero = ''; atualizar(); };
        desenhar();
    }

    /* =================================================================
       SUA BIBLIOTECA
       ================================================================= */
    async function biblioteca(p, q) {
        const aba = q.aba || 'repertorios';
        const ord = q.ord || 'recentes';
        const [ms, rs] = await Promise.all([DB.listarMusicas(), DB.listarRepertorios()]);
        const link = (a, o) => '#/biblioteca?aba=' + a + '&ord=' + o;
        let h = barraTopo('Discografia', '<button class="bt-icone" data-criar-menu aria-label="Criar: nova cifra ou novo repertório">' + icone('mais') + '</button>') +
            abertura(5, 'Sua coleção particular', 'Música boa fica por aqui.', ms.length + ' cifras e ' + rs.length + ' repertórios no seu aparelho. Organize seus sons para o próximo ensaio.') +
            '<div class="chips" style="margin-bottom:10px">' +
            [['repertorios', 'Repertórios'], ['cifras', 'Cifras'], ['pendentes', 'Sem cifra'], ['curtidas', 'Curtidas']].map(([k, t]) => '<a class="chip ' + (k === aba ? 'ativo' : '') + '" href="' + link(k, ord) + '">' + t + '</a>').join('') + '</div>' +
            '<a class="dica" style="display:inline-flex;align-items:center;gap:4px;margin-bottom:6px" href="' + link(aba, ord === 'recentes' ? 'az' : 'recentes') + '">' +
            icone('relogio', ' style="width:15px;height:15px"') + (ord === 'recentes' ? 'Recentes' : 'Ordem alfabética') + '</a>';

        const ordenar = (arr, campoT, campoNome) => arr.sort(ord === 'az'
            ? (a, b) => a[campoNome].localeCompare(b[campoNome], 'pt-BR')
            : (a, b) => (b[campoT] || b.criadaEm || b.criadoEm || 0) - (a[campoT] || a.criadaEm || a.criadoEm || 0));

        if (aba === 'repertorios') {
            h += '<div class="lista">' + await linhaCurtidas() + ordenar(rs, 'abertoEm', 'nome').map(linhaRep).join('') + '</div>';
            h += '<div class="dupla" style="margin-top:12px">' + baixarRepertorios() + '</div>';
            if (!rs.length) h += '<div class="vazio"><p>Crie um repertório para montar seu show ou ensaio.</p><button class="bt prim" data-novo-rep>' + icone('mais') + 'Novo repertório</button></div>';
        } else {
            const lista = aba === 'curtidas' ? ms.filter(m => m.curtida) : aba === 'pendentes' ? ms.filter(m => !(m.cifra || '').trim()) : ms;
            // "Sem cifra" segue a ordem da lista original (nº), para você ir colando em sequência.
            const ordenada = aba === 'pendentes'
                ? lista.sort((a, b) => (a.numeroLista || 9999) - (b.numeroLista || 9999) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
                : ordenar(lista, 'abertaEm', 'titulo');
            h += lista.length ? '<div class="lista">' + ordenada.map(m => linhaMusica(m)).join('') + '</div>'
                : (aba === 'pendentes' ? '<div class="vazio">Todas as cifras já foram coladas.</div>' : vazio('Nada por aqui ainda', 'Adicionar cifra'));
        }
        h += '<h2 class="secao">Backup</h2><div class="dupla">' +
            '<button class="bt" data-exportar>' + icone('baixar') + 'Exportar</button><button class="bt" data-importar>' + icone('subir') + 'Importar</button></div>' +
            '<p class="dica">' + ms.length + ' cifras e ' + rs.length + ' repertórios salvos neste aparelho.</p>';
        tela().innerHTML = h;
        tela().querySelectorAll('[data-novo-rep]').forEach(b => b.onclick = novoRepertorio);
        tela().querySelector('[data-exportar]').onclick = () => App.exportar();
        tela().querySelector('[data-importar]').onclick = () => App.importar();
    }

    /* =================================================================
       CRIAR / EDITAR CIFRA — rápido: nome + colar a cifra + salvar
       ================================================================= */
    async function criar(p) {
        const editando = p.id ? await DB.pegarMusica(p.id) : null;
        if (p.id && !editando) { ir('#/'); return; }
        const m = editando || { titulo: '', artista: '', tom: '', bpm: '', compasso: '4/4', capo: 0, cifra: '' };

        tela().innerHTML =
            '<div class="topo"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button><h1 class="titulo" style="margin:0;flex:1;font-size:22px">' + (editando ? 'Editar cifra' : 'Nova cifra') + '</h1></div>' +
            abertura(2, editando ? 'Cada detalhe no seu lugar' : 'Uma nova música começa aqui', editando ? 'Deixe do seu jeito.' : 'Do papel para o palco.', 'Cole ou escreva a cifra, confira a prévia e salve na sua coleção.') +
            '<form class="form" id="f-cifra" autocomplete="off">' +
            '<div class="dupla"><div><label for="c-titulo">Nome da música</label><input class="entrada" id="c-titulo" placeholder="Como se chama a música?" value="' + esc(m.titulo) + '" maxlength="100"></div>' +
            '<div><label for="c-artista">Artista</label><input class="entrada" id="c-artista" placeholder="Quem canta?" value="' + esc(m.artista) + '" maxlength="100"></div></div>' +
            (editando && m.fonte ? '<a class="bt contorno cheio" href="' + esc(m.fonte) + '" target="_blank" rel="noopener">Abrir a cifra no site ↗</a>' : '') +
            '<div class="abas"><button type="button" class="chip ativo" data-aba="escrever">Cifra</button><button type="button" class="chip" data-aba="previa">Prévia</button>' +
            '<span style="flex:1"></span><button type="button" class="chip contorno" id="c-colar">' + icone('colar', ' style="width:16px;height:16px;vertical-align:-3px"') + ' Colar</button>' +
            '<button type="button" class="chip contorno" id="c-abrir">' + icone('subir', ' style="width:16px;height:16px;vertical-align:-3px"') + ' Arquivo</button>' +
            '<input type="file" id="c-arquivo" accept=".cho,.chopro,.chordpro,.crd,.pro,.txt,text/plain" hidden></div>' +
            '<textarea class="entrada" id="c-cifra" aria-label="Texto da cifra" spellcheck="false" placeholder="Cole a cifra aqui (acordes em cima da letra).\n\n[Intro]\nG  D  Em  C\n\n[Verso]\nG              D\nEscreva a letra aqui embaixo\nEm             C\ne os acordes na linha de cima">' + esc(m.cifra) + '</textarea>' +
            '<div id="c-previa" hidden style="background:var(--sup-1);border-radius:8px;padding:12px;min-height:46vh"><div id="cifra-conteudo" style="padding-bottom:0"></div></div>' +
            '<div class="dica" id="c-detectado"></div>' +
            (!editando && global.Pacotes ? '<details class="mais"><summary>Procurar cifra na internet</summary>' + Pacotes.htmlFontes() +
                '<div class="lista"><a class="op" href="baixar.html#repertorios">' + icone('baixar') + '<span class="op-txt">Baixar repertórios<br><small>Packs de cifras prontos para importar.</small></span></a></div>' +
                '<p class="dica">Copie a cifra no site, volte aqui e toque em Colar. Arquivos ChordPro (.cho) entram pelo botão Arquivo.</p></details>' : '') +
            '<details class="mais"' + (editando ? ' open' : '') + '><summary>Mais opções (tom, BPM, capo)</summary>' +
            '<div class="tripla"><div><label>Tom</label><input class="entrada" id="c-tom" placeholder="auto" value="' + esc(m.tom) + '" maxlength="8"></div>' +
            '<div><label>BPM</label><input class="entrada" id="c-bpm" type="number" inputmode="numeric" min="0" max="300" placeholder="—" value="' + esc(m.bpm || '') + '"></div>' +
            '<div><label>Capo</label><input class="entrada" id="c-capo" type="number" inputmode="numeric" min="0" max="12" value="' + esc(m.capo || 0) + '"></div></div>' +
            '<div style="margin-top:10px"><label>Compasso</label><select class="entrada" id="c-compasso">' +
            ['4/4', '3/4', '2/4', '6/8', '12/8', '7/4'].map(c => '<option' + (c === m.compasso ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
            '<div style="margin-top:10px"><label for="c-genero">Gênero musical</label><select class="entrada" id="c-genero"><option value="">Automático pelo artista</option>' + Catalogo.generos.map(g => '<option value="' + g.id + '"' + (m.genero === g.id ? ' selected' : '') + '>' + g.nome + '</option>').join('') + '<option value="outros"' + (m.genero === 'outros' ? ' selected' : '') + '>Outros</option></select></div>' +
            '<div style="margin-top:10px"><label for="c-fonte">Link de onde veio a cifra (opcional)</label><input class="entrada" id="c-fonte" type="url" inputmode="url" placeholder="https://..." value="' + esc(m.fonte || '') + '" maxlength="300"></div>' +
            '<p class="dica">BPM e compasso definem o ritmo da rolagem automática da cifra.</p></details>' +
            '<div class="barra-salvar"><button class="bt prim cheio" type="submit">' + icone('check') + (editando ? 'Salvar alterações' : 'Salvar cifra') + '</button></div>' +
            '</form>';

        const $ = (id) => document.getElementById(id);
        const ta = $('c-cifra');
        let alterado = false;

        /* Converte ChordPro ([G]letra) automaticamente e mostra o tom detectado. */
        function analisar() {
            if (!ta.isConnected) return;
            const txt = ta.value;
            const colchetes = (txt.match(/\[([^\]\n]+)\]/g) || []).filter(x => CifraMotor.ehAcorde(x.slice(1, -1)));
            if (colchetes.length >= 2) {
                const conv = CifraMotor.chordProParaCifra(txt);
                ta.value = conv.texto;
                if (conv.titulo && !$('c-titulo').value) $('c-titulo').value = conv.titulo;
                if (conv.artista && !$('c-artista').value) $('c-artista').value = conv.artista;
                if (conv.tom && !$('c-tom').value) $('c-tom').value = conv.tom;
                toast('Cifra convertida do formato ChordPro');
            }
            const acordes = CifraMotor.listarAcordes(ta.value);
            const tom = acordes.length ? CifraMotor.detectarTom(ta.value) : '';
            $('c-tom').placeholder = tom ? 'auto: ' + tom : 'auto';
            $('c-detectado').textContent = acordes.length ? acordes.length + ' acordes · tom provável: ' + tom + ' · ' + acordes.slice(0, 12).join('  ') : '';
        }
        let tA; ta.addEventListener('input', () => { alterado = true; clearTimeout(tA); tA = setTimeout(analisar, 250); });
        let tColar;
        ta.addEventListener('paste', () => { clearTimeout(tColar); tColar = setTimeout(analisar, 30); });
        analisar();

        $('c-colar').onclick = async () => {
            try {
                const t = await navigator.clipboard.readText();
                if (!t) { toast('Área de transferência vazia'); return; }
                ta.value = t; alterado = true; analisar(); toast('Cifra colada');
            } catch (e) { ta.focus(); toast('Toque e segure na caixa para colar'); }
        };
        // Abrir arquivo ChordPro/texto: o mesmo caminho do Colar (analisar() converte o ChordPro).
        $('c-abrir').onclick = () => $('c-arquivo').click();
        $('c-arquivo').onchange = async (ev) => {
            const f = ev.target.files[0]; ev.target.value = '';
            if (!f) return;
            if (f.size > 512 * 1024) { toast('Arquivo grande demais para uma cifra'); return; }
            if (ta.value.trim() && !(await confirmar('Trocar o texto atual?', 'O que está na caixa será substituído pelo arquivo ' + f.name + '.', 'Trocar'))) return;
            ta.value = await f.text(); alterado = true; analisar(); toast('Arquivo aberto: ' + f.name);
        };
        tela().querySelectorAll('[data-aba]').forEach(b => b.onclick = () => {
            tela().querySelectorAll('[data-aba]').forEach(x => x.classList.toggle('ativo', x === b));
            const prev = b.dataset.aba === 'previa';
            ta.hidden = prev; $('c-previa').hidden = !prev;
            if (prev) {
                const tom = $('c-tom').value.trim() || CifraMotor.detectarTom(ta.value);
                $('cifra-conteudo').innerHTML = CifraMotor.renderizarCifra(ta.value, { tom }).html || '<p class="dica">Nada para mostrar ainda.</p>';
            }
        });

        $('f-cifra').onsubmit = async (e) => {
            e.preventDefault();
            const titulo = $('c-titulo').value.trim();
            const cifra = ta.value.replace(/\s+$/, '');
            if (!titulo) { toast('Dê um nome para a música'); $('c-titulo').focus(); return; }
            if (!cifra) { toast('Cole ou escreva a cifra'); ta.focus(); return; }
            const tomDigitado = $('c-tom').value.trim();
            const tom = tomDigitado && CifraMotor.ehAcorde(tomDigitado) ? tomDigitado : (CifraMotor.listarAcordes(cifra).length ? CifraMotor.detectarTom(cifra) : '');
            const dados = Object.assign({}, editando || {}, {
                titulo, artista: $('c-artista').value.trim(), cifra, tom,
                bpm: parseInt($('c-bpm').value, 10) || 0,
                capo: Math.max(0, Math.min(12, parseInt($('c-capo').value, 10) || 0)),
                compasso: $('c-compasso').value,
                genero: $('c-genero').value,
                fonte: /^https?:\/\/\S+$/i.test($('c-fonte').value.trim()) ? $('c-fonte').value.trim() : '',
            });
            if (editando && editando.tom !== tom) dados.semitons = 0; // tom original mudou: zera a transposição
            const salva = await DB.salvarMusica(dados);
            alterado = false;
            toast(editando ? 'Alterações salvas' : 'Cifra salva!');
            location.replace('#/cifra/' + salva.id);
        };

        // Aviso ao sair sem salvar
        const avisar = (e) => { if (alterado) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', avisar);
        const tFoco = !editando ? setTimeout(() => $('c-titulo')?.focus(), 60) : null;
        return () => {
            clearTimeout(tA); clearTimeout(tColar); clearTimeout(tFoco);
            window.removeEventListener('beforeunload', avisar);
        };
    }

    /* =================================================================
       CIFRA — a tela principal para tocar
       ================================================================= */
    async function cifra(p, q) {
        const m = await DB.pegarMusica(p.id);
        if (!m) { toast('Cifra não encontrada'); ir('#/'); return; }

        // Contexto de repertório (modo show): #/cifra/ID?rep=RID&i=N
        let rep = null, item = null, posicoes = [];
        if (q.rep) {
            rep = await DB.pegarRepertorio(q.rep);
            if (rep) {
                posicoes = rep.itens.filter(i => i.tipo === 'musica');
                item = posicoes[parseInt(q.i, 10) || 0];
                if (!item || item.musicaId !== m.id) item = posicoes.find(i => i.musicaId === m.id) || null;
                if (!item) rep = null;
            }
        }
        const idx = item ? posicoes.indexOf(item) : -1;
        const musicasRep = rep ? Object.fromEntries((await DB.listarMusicas()).map(x => [x.id, x])) : {};
        const proxItem = rep ? posicoes[idx + 1] : null;
        const proxMus = proxItem ? musicasRep[proxItem.musicaId] : null;

        await DB.atualizarMusica(m.id, { abertaEm: Date.now(), tocadas: (m.tocadas || 0) + 1 });
        await DB.gravarMeta('ultima', { id: m.id, rep: rep ? rep.id : null, i: idx });

        let pr = prefs();
        const st = {
            // ?st=N (banda sincronizada): toca no tom da banda só nesta abertura, sem salvar.
            semitons: q.st != null && q.st !== '' && !isNaN(+q.st) ? Math.max(-6, Math.min(5, Math.round(+q.st))) : (item ? (item.semitons || 0) : (m.semitons || 0)),
            capo: m.capo || 0,
            rolando: false, acumulado: 0, ultimoT: 0, raf: 0,
            palco: false, fraseBpm: -1, ignoraClique: false,
        };
        let tocador = null; // rolagem por BPM (js/rolagem-bpm.js)

        document.body.classList.add('tela-cifra');
        tela().innerHTML =
            '<div class="cifra-topo"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button>' +
            '<div class="ct-txt"><div class="ct-tit">' + esc(m.titulo) + '</div><div class="ct-sub">' + esc(m.artista || 'Cifra') + '</div></div>' +
            '<button class="bt-icone bt-sec" id="bt-curtir" aria-label="Curtir"></button>' +
            '<button class="bt-icone bt-sec" id="bt-menu" aria-label="Opções">' + icone('pontos') + '</button></div>' +
            (rep ? '<div class="faixa-rep show"><button class="bt-icone" id="bt-ant" ' + (idx <= 0 ? 'disabled' : '') + ' aria-label="Anterior">' + icone('anterior') + '</button>' +
                '<button class="fr-txt" id="bt-lista" aria-label="Lista do repertório"><span><b>' + (idx + 1) + '/' + posicoes.length + '</b> · ' + esc(rep.nome) + ' ▾</span>' +
                '<small>' + (proxMus ? 'Próxima: ' + esc(proxMus.titulo) + ' · ' + esc(tomAtual(proxMus, proxItem.semitons)) : 'Última música') + '</small></button>' +
                '<button class="bt-icone" id="bt-busca-rep" aria-label="Pesquisar no repertório">' + icone('busca') + '</button>' +
                '<button class="bt-icone" id="bt-prox" ' + (idx >= posicoes.length - 1 ? 'disabled' : '') + ' aria-label="Próxima">' + icone('proxima') + '</button>' +
                '<div class="prog-show" id="prog-show" title="Tempo de show"><i id="prog-show-i"></i></div></div>' : '') +
            '<div class="cifra-l1"><div class="cifra-info" id="cifra-info"></div><div class="faixa-acordes" id="faixa-acordes"></div></div>' +
            '<div class="cifra-l2"><span class="ci-bpm" id="cifra-bpm"></span><div class="ci-icones" id="ci-icones"><button class="ci-ic" id="abrir-aprender" aria-label="Aprender com vídeo" title="Aprender com vídeo"><svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z" style="fill:currentColor"/></svg></button></div></div>' +
            '<div id="cifra-conteudo"></div>' +
            '<div class="doca" id="doca"></div>';

        const $ = (id) => document.getElementById(id);
        const conteudo = $('cifra-conteudo');
        $('abrir-aprender').onclick = () => Aprender.abrir(m);
        if (rep) {
            const anterior = await DB.lerMeta('ultima-preparacao');
            if(anterior && (anterior.capo !== (m.capo||0) || anterior.afinacao !== (m.afinacao||'Padrão'))) {
                const aviso=document.createElement('p');aviso.className='dica';aviso.textContent='Prepare o instrumento: capo '+(m.capo||0)+' · afinação '+(m.afinacao||'Padrão');conteudo.before(aviso);
            }
            await DB.gravarMeta('ultima-preparacao',{capo:m.capo||0,afinacao:m.afinacao||'Padrão'});
        }

        /* Tamanho da letra: até caber a linha inteira, é só zoom. Acima disso as linhas QUEBRAM por palavra
           (acorde em cima da sua sílaba), como no Cifra Club, até a maior palavra ocupar a tela. */
        let emPorCol = 0;
        function larguraColuna() { // largura de 1 caractere da fonte monoespaçada, em "em"
            if (!emPorCol) {
                const cv = document.createElement('canvas').getContext('2d');
                cv.font = '100px ' + getComputedStyle(conteudo).fontFamily;
                emPorCol = cv.measureText('MMMMMMMMMM').width / 1000 || 0.6;
            }
            return emPorCol;
        }
        function pctQueCabe(cols) { // em % (100% = 15px)
            if (!cols) return 320;
            const util = conteudo.clientWidth / (pr.duasColunas && window.innerWidth >= 1200 ? 2.1 : 1) - 2;
            const fator = st.palco ? 1.25 : 1;
            return Math.max(70, Math.min(320, Math.floor(util / (cols * larguraColuna() * fator) / 15 * 100)));
        }
        const limiteSemQuebra = () => pctQueCabe(st.maxCols);              // a linha mais comprida cabe inteira
        const limiteFonte = () => pctQueCabe(Math.min(st.maxPalavra || st.maxCols, 8)); // palavras maiores que ~8 letras também quebram
        /* Refaz a cifra ligando/desligando a quebra e mantém a mesma frase no topo da tela. */
        function reagrupar() {
            let alvo = null, desloc = 0;
            for (const el of conteudo.querySelectorAll('[data-frase]')) {
                const r = el.getBoundingClientRect();
                if (r.bottom > 90) { alvo = el.dataset.frase; desloc = r.top; break; }
            }
            desenhar();
            if (alvo !== null) {
                const el = conteudo.querySelector('[data-frase="' + alvo + '"]');
                if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - desloc);
            }
        }
        /* Aplica o tamanho. Devolve true se precisou refazer a cifra (mudou a quebra de linha). */
        function aplicarFonte() {
            if (st.maxCols && (pr.fonte > limiteSemQuebra()) !== !!st.quebra) { reagrupar(); return true; }
            st.fonteEf = Math.min(pr.fonte, limiteFonte());
            document.documentElement.style.setProperty('--fonte-cifra', (15 * st.fonteEf / 100) + 'px');
            return false;
        }
        /* Muda o tamanho (em %), respeitando o que cabe na tela. */
        function definirFonte(novo, salvar) {
            const lim = limiteFonte();
            let alvo = Math.max(70, Math.min(320, Math.round(novo)));
            const estourou = alvo > lim;
            if (estourou) alvo = lim;
            pr.fonte = alvo; aplicarFonte();
            if (salvar !== false) pr = salvarPrefs({ fonte: alvo });
            return estourou;
        }
        function maisFonte(d) {
            const ef = st.fonteEf || pr.fonte, passo = Math.max(10, Math.round(ef * 0.1 / 5) * 5);
            if (definirFonte(ef + (d > 0 ? passo : -passo)) && d > 0) toast('Esse é o maior tamanho que cabe na tela');
        }

        let limparProx = null, limparBat = null;   // cartão da próxima música e barra do baterista (js/show-ajuda.js)
        /* Desenha a cifra com o tom/capo/opções atuais. */
        function desenhar() {
            const r = CifraMotor.renderizarCifra(m.cifra, {
                semitons: st.semitons, capo: st.capo, tom: m.tom,
                bemol: pr.bemol === 'auto' ? 'auto' : pr.bemol === 'bemol', simplificar: pr.simplificar,
            });
            conteudo.innerHTML = r.html;
            conteudo.classList.toggle('duas-colunas', !!pr.duasColunas);
            conteudo.classList.toggle('bpm-ativo', !!m.rolagemBpm);
            // Música ainda sem cifra: mostra o caminho para colar (link do site + editor).
            const semCifra = !(m.cifra || '').trim();
            if (semCifra) {
                conteudo.innerHTML = '<div class="vazio"><img src="img/brand/dog-pub.webp" width="110" height="110" decoding="async" alt=""><p>Esta música ainda não tem cifra.</p><div class="acoes">' +
                    (m.fonte ? '<a class="bt contorno cheio" href="' + esc(m.fonte) + '" target="_blank" rel="noopener">Abrir a cifra no site ↗</a>' : '') +
                    '<a class="bt prim cheio" href="#/editar/' + m.id + '">' + icone('colar') + 'Colar a cifra</a></div></div>';
            }
            $('doca').hidden = semCifra;
            marcarFrases(conteudo);
            st.maxCols = [...conteudo.querySelectorAll('.l')].reduce((mx, el) => Math.max(mx, el.textContent.replace(/\s+$/, '').length), 0);
            st.quebra = !!st.maxCols && pr.fonte > limiteSemQuebra();
            st.maxPalavra = reflowCifra(conteudo, st.quebra);
            conteudo.classList.toggle('quebra', st.quebra);
            aplicarFonte();
            // Redesenhou (ex.: trocou o tom): mantém a frase marcada da rolagem por BPM.
            if (st.fraseBpm >= 0) conteudo.querySelectorAll('[data-frase="' + st.fraseBpm + '"]').forEach(el => el.classList.add('frase-ativa'));
            $('faixa-acordes').innerHTML = r.acordes.map(a => '<button data-acorde="' + esc(a) + '">' + esc(a) + '</button>').join('');
            const tomSoa = tomAtual(m, st.semitons);
            const forma = st.capo ? CifraMotor.transporTom(m.tom || 'C', st.semitons - st.capo) : '';
            $('cifra-info').innerHTML =
                '<span class="tom-topo"><button data-d="tom-" aria-label="Baixar meio tom">' + icone('menos') + '</button>' +
                '<button class="tom-atual" data-d="tom0" aria-label="Voltar ao tom original"><small>TOM</small>' + esc(tomSoa) + '</button>' +
                '<button data-d="tom+" aria-label="Subir meio tom">' + icone('mais') + '</button></span>' +
                (m.tom ? '<span class="badge">Tom original: ' + esc(m.tom) + '</span>' : '') +
                (st.semitons ? '<span class="badge verm">Transposto: ' + (st.semitons > 0 ? '+' : '') + st.semitons + ' ½</span>' : '') +
                (st.capo ? '<span class="badge">Capo ' + st.capo + 'ª · forma de ' + esc(forma) + '</span>' : '') +
                // Cifra de pacote/licença livre: mostra o crédito (obrigatório em CC BY).
                (m.licenca && m.licenca.tipo && m.licenca.tipo !== 'pessoal' ? '<span class="badge" style="max-width:100%;white-space:normal;line-height:1.3;height:auto;padding-top:3px;padding-bottom:3px">' + esc(((global.Pacotes && Pacotes.LICENCAS[m.licenca.tipo]) || m.licenca.tipo) + (m.licenca.atribuicao || m.licenca.fonte ? ' · ' + (m.licenca.atribuicao || m.licenca.fonte) : '')) + '</span>' : '') +
                '';
            $('cifra-bpm').innerHTML =
                (m.bpm ? '<span class="badge">' + m.bpm + ' BPM · ' + esc(m.compasso || '4/4') + '</span>' : '<span class="badge">' + esc(m.compasso || '4/4') + '</span>') +
                (m.obsCompasso ? '<span class="badge">' + esc(m.obsCompasso) + '</span>' : '');
            // js/show-ajuda.js: modo baterista e cartão "Próxima" (emendar + avisos) no fim da cifra
            if (global.ShowAjuda) {
                ShowAjuda.aplicarBaterista(conteudo, m, !!pr.baterista && !semCifra);
                if (pr.baterista && !semCifra && !limparBat) limparBat = ShowAjuda.barraBaterista(conteudo, m);
                if ((!pr.baterista || semCifra) && limparBat) { limparBat(); limparBat = null; }
                if (limparProx) { limparProx(); limparProx = null; }
                if (proxMus && !semCifra) {
                    const area = document.createElement('div'); area.id = 'prox-card'; conteudo.appendChild(area);
                    limparProx = ShowAjuda.desenharProxima({ el: area, m, semitons: st.semitons, capo: st.capo,
                        prox: { m: proxMus, semitons: proxItem.semitons || 0 }, irProxima: () => irPara(idx + 1) });
                }
            }
            desenharDoca(tomSoa);
            $('bt-curtir').innerHTML = icone(m.curtida ? 'coracao' : 'coracaoVazio', m.curtida ? ' style="color:var(--verm-claro)"' : '');
        }

        function desenharDoca(tomSoa) {
            const bpmGrupo = '<div class="grupo"><button class="bt-icone" data-d="bpm-" aria-label="Diminuir BPM">' + icone('menos') + '</button><span class="vel" style="min-width:34px">' + (m.bpm || '—') + '</span><button class="bt-icone" data-d="bpm+" aria-label="Aumentar BPM">' + icone('mais') + '</button></div>';
            const progGrupo = '<div class="grupo"><button class="bt-icone" data-d="passo-" aria-label="Passo anterior">' + icone('anterior') + '</button><span class="vel" style="min-width:48px">' + ((st.progPasso || 0) + 1) + '/' + nPassos() + '</span><button class="bt-icone" data-d="passo+" aria-label="Próximo passo">' + icone('proxima') + '</button></div>';
            const meio = st.rolando
                ? (m.rolagemProg ? progGrupo : m.rolagemBpm ? bpmGrupo : '<div class="grupo"><button class="bt-icone" data-d="vel-" aria-label="Mais devagar">' + icone('menos') + '</button><span class="vel">' + pr.velocidade + '</span><button class="bt-icone" data-d="vel+" aria-label="Mais rápido">' + icone('mais') + '</button></div>')
                : '<div class="grupo"><button class="bt-icone" data-d="fonte-" aria-label="Diminuir letra" style="font-weight:800;font-size:13px">A−</button><button class="bt-icone" data-d="fonte+" aria-label="Aumentar letra" style="font-weight:800;font-size:17px">A+</button></div>';
            $('doca').innerHTML =
                '<button class="bt-custom" data-d="custom" aria-label="Botão personalizável (segure para trocar a função)">' + icone('estrela') + '<small>' + esc(nomeCurto(pr.botaoAcao)) + '</small></button>' +
                '<span class="sep"></span>' + meio + '<span class="sep"></span>' +
                '<button class="bt-rolar" data-d="rolar" aria-label="Rolagem automática">' + icone(st.rolando ? 'pause' : 'play') + '</button>' +
                '<button class="bt-icone" data-d="ajustes" aria-label="Ajustes">' + icone('ajustes') + '</button>';
        }

        /* Salva a transposição (no item do repertório, ou na própria música). */
        async function salvarTom() {
            if (item) {
                const r = await DB.pegarRepertorio(rep.id);
                const it = r.itens.find(i => i.id === item.id);
                if (it) { it.semitons = st.semitons; await DB.salvarRepertorio(r); }
            } else {
                await DB.atualizarMusica(m.id, { semitons: st.semitons });
            }
        }
        function transpor(d) {
            st.semitons = d === 0 ? 0 : ((st.semitons + d + 18) % 12) - 6; // fica entre -6 e +5
            desenhar(); salvarTom();
        }

        /* ---------- Rolagem automática (velocidade 1–10) ---------- */
        function passo(t) {
            if (!st.rolando) return;
            // Dedo na tela (ou embalo / roda do mouse): a rolagem espera, sem desligar, e volta sozinha ao soltar.
            if (UI.usuarioRolando()) { st.ultimoT = 0; st.acumulado = 0; st.raf = requestAnimationFrame(passo); return; }
            if (st.ultimoT) {
                // Proporcional ao tamanho da letra: com a cifra maior (pinça ou A+) a rolagem programada anda mais rápido.
                const pxPorSeg = (6 + (pr.velocidade - 1) * 9) * ((st.fonteEf || pr.fonte) / 100); // base: fórmula do Cifra-Dog original
                st.acumulado += pxPorSeg * (t - st.ultimoT) / 1000;
                const px = Math.floor(st.acumulado);
                if (px >= 1) { window.scrollBy(0, px); st.acumulado -= px; }
                if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) { pararRolagem(); return; }
            }
            st.ultimoT = t;
            st.raf = requestAnimationFrame(passo);
        }
        /* Rolagem por BPM: cria o tocador uma vez por música aberta. */
        function pegarTocador() {
            if (!tocador) {
                tocador = RolagemBPM.criar({
                    container: conteudo, musica: m, clique: pr.cliqueBpm,
                    aoMudar: (e) => {
                        st.fraseBpm = e.frase;
                        if (st.rolando !== e.ativo) { st.rolando = e.ativo; desenharDoca(tomAtual(m, st.semitons)); }
                    },
                });
            }
            return tocador;
        }
        function iniciarBpm(fraseInicial) {
            if (!m.bpm) { toast('Defina o BPM da música'); abrirAjustes(); return; }
            if (!pegarTocador().iniciar(fraseInicial)) { toast('Não foi possível iniciar a rolagem por BPM'); return; }
            manterTelaLigada(true);
        }
        /* ---------- Rolagem programada (js/programada.js) ---------- */
        let prog = null, grav = null;
        const nPassos = () => (m.programa && m.programa.passos ? m.programa.passos.length : 0);
        function pegarProg() {
            if (!prog) {
                prog = Programada.criar({
                    container: conteudo, musica: m,
                    aoMudar: (e) => { st.progPasso = e.passo; if (!e.ativo) pararPulsoProg(); if (st.rolando !== e.ativo) st.rolando = e.ativo; desenharDoca(tomAtual(m, st.semitons)); },
                });
            }
            return prog;
        }
        /* Pontinhos do tempo + contagem de entrada (js/metronomo.js), só quando a música tem BPM. */
        let pulsoProg = null;
        function pararPulsoProg() { if (pulsoProg) { pulsoProg.parar(); pulsoProg = null; } }
        function iniciarProg() {
            if (!nPassos()) { toast('Grave ou gere a programação primeiro'); abrirAjustes(); return; }
            const i = (st.progPasso || 0) < nPassos() - 1 ? (st.progPasso || 0) : 0;
            pararPulsoProg();
            if (!m.bpm || !window.Metronomo) { if (pegarProg().iniciar(i)) manterTelaLigada(true); return; }
            // Com BPM: a linha de entrada já aparece marcada, toca a contagem (uns 4 cliques) e só então a rolagem anda.
            const inicio = performance.now() + 150 + Metronomo.msDeEntrada(m.bpm, m.compasso);
            RolagemBPM.marcarFrase(conteudo, m.programa.passos[i].f);
            st.progPasso = i; st.rolando = true; desenharDoca(tomAtual(m, st.semitons)); manterTelaLigada(true);
            pulsoProg = Metronomo.pulso({
                bpm: m.bpm, compasso: m.compasso, tempo: () => performance.now() - inicio,
                som: pr.cliqueBpm ? 'sempre' : 'contagem',
                aoTerminarContagem: () => { if (st.rolando && !pegarProg().ativo()) pegarProg().iniciar(i); },
            });
        }
        /* Liga a rolagem programada (e desliga a rolagem por BPM, que não combina com ela). */
        function ativarProg() {
            const mud = { rolagemProg: true };
            m.rolagemProg = true;
            if (m.rolagemBpm) { m.rolagemBpm = false; mud.rolagemBpm = false; if (tocador) { tocador.destruir(); tocador = null; } st.fraseBpm = -1; }
            return mud;
        }
        async function salvarProg(p) {
            if(p.origem==="video")p.videoId=Aprender.estado()?.tipo==="youtube"?m.youtube:null;
            const mud = ativarProg();
            m.programa = p; mud.programa = p; st.progPasso = 0;
            if (prog) { prog.destruir(); prog = null; }
            await DB.atualizarMusica(m.id, mud);
            desenhar();
        }
        const fmtTempo = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
        function comecarGravacao() {
            const video=!!Aprender.estado()?.tipo;
            if(video&&!Aprender.tocando()){toast("Dê play no vídeo antes de gravar as linhas.");return;}
            ShowProgramado.gravando(true);
            if(video)document.querySelector("#aula-panel")?.classList.add("recolhido");
            if (st.rolando) pararRolagem();
            window.scrollTo(0, 0);
            grav = Programada.gravar({ container: conteudo, aoMudar: desenharGravador, ...(video?{relogio:()=>Aprender.tempo()*1000}:{}) });
            st.gravando = true; $('doca').hidden = true;
            desenharGravador({ estado: 'espera', passos: 0, ms: 0 });
        }
        function fimGravacao() {
            ShowProgramado.gravando(false);
            const g = document.getElementById('gravador'); if (g) g.remove();
            st.gravando = false; grav = null; $('doca').hidden = !(m.cifra || '').trim();
            RolagemBPM.limparMarca(conteudo);
        }
        function desenharGravador(e) {
            let g = document.getElementById('gravador');
            if (!g) {
                g = document.createElement('div'); g.id = 'gravador'; document.body.appendChild(g);
                g.onclick = (ev) => {
                    const b = ev.target.closest('[data-gv]'); if (!b || !grav) return;
                    const k = b.dataset.gv;
                    if (k === 'comecar') grav.comecar();
                    if (k === 'desfazer') grav.desfazer();
                    if (k === 'cancelar') { grav.cancelar(); fimGravacao(); }
                    if (k === 'concluir') {
                        // Com menos de 2 linhas marcadas continua gravando (antes a gravação era perdida).
                        if (grav.estado() !== 'gravando' || grav.passos() < 2) { toast('Marque pelo menos 2 linhas antes de concluir'); return; }
                        const p = grav.concluir(m.programa && m.programa.avanco);
                        fimGravacao();
                        salvarProg(p).then(() => { if (window.Metronomo) Metronomo.celebrar('Rolagem Programada!', p.passos.length + ' passos salvos'); else toast('Rolagem Programada!'); });
                    }
                };
            }
            if (g.dataset.estado !== e.estado) {
                g.dataset.estado = e.estado;
                g.innerHTML = e.estado === 'espera'
                    ? '<div class="gv-txt"><b>Gravar a programação</b><small>Dê o play na música e toque em Começar (ou pise o pedal na hora em que a 1ª linha começa). Depois, a cada linha nova, pise o pedal ou toque na linha.</small></div><button class="bt prim" data-gv="comecar">Começar</button><button class="bt" data-gv="cancelar">Cancelar</button>'
                    : '<div class="gv-txt"><b><span class="gv-rec"></span>Gravando · <span id="gv-tempo">0:00</span></b><small id="gv-dica"><span id="gv-n">0</span> passos · pedal (descer / subir desfaz) ou toque na linha</small></div><button class="bt-icone" data-gv="desfazer" aria-label="Desfazer o último passo">' + icone('anterior') + '</button><button class="bt prim" data-gv="concluir">Concluir</button><button class="bt" data-gv="cancelar">Cancelar</button>';
            }
            const t = document.getElementById('gv-tempo'), n = document.getElementById('gv-n');
            if (t) t.textContent = fmtTempo(e.ms); if (n) n.textContent = e.passos;
            const dica = document.getElementById('gv-dica');
            if (dica) dica.classList.toggle('gv-aguarda', e.estado === 'gravando' && !e.passos);
        }
        conteudo.addEventListener('click', (e) => {
            if (!st.gravando || !grav || grav.estado() !== 'gravando') return;
            const el = e.target.closest('[data-frase]'); if (!el) return;
            e.stopPropagation(); grav.marcar(parseInt(el.dataset.frase, 10));
        }, true);

        function pedirAgrupar() {
            if (!m.bpm) { toast('Defina o BPM da música primeiro'); abrirAjustes(); return; }
            perguntar('Quantas linhas descem de uma vez? (1 = uma a uma)', '1', 'Gerar').then(v => {
                if (v === null) return;
                const g = parseInt(v, 10);
                if (!(g >= 1 && g <= 8)) { toast('Use um número de 1 a 8'); return; }
                const p = Programada.pelosBpm(m, conteudo, g);
                salvarProg(p).then(() => toast('Programação pelo BPM: ' + p.passos.length + ' passos'));
            });
        }
        function abrirPassos() {
            const ps = (m.programa && m.programa.passos) || [];
            const seg = (ms) => ms == null ? 'espera o pedal' : (ms / 1000).toFixed(1).replace('.', ',') + ' s';
            abrirSheet(
                '<h3 style="margin:0 0 4px">Passos da programação</h3><p class="dica" style="margin:0 0 6px">Cada passo mostra uma linha da cifra. − e + mudam o tempo do passo (0,25 s); ✕ apaga o passo.</p>' +
                ps.map((p, i) => '<div class="ajuste"><span><b>' + (i + 1) + '.</b> ' + esc(Programada.resumoFrase(conteudo, p.f)) + '<br><small class="dica">Linha ' + (p.f + 1) + ' · ' + seg(p.ms) + '</small></span>' +
                    '<div class="aj-ctrl"><button class="mini-bt" data-p="-' + i + '" aria-label="Menos tempo">−</button><button class="mini-bt" data-p="+' + i + '" aria-label="Mais tempo">+</button><button class="mini-bt" data-p="x' + i + '" aria-label="Apagar passo">✕</button></div></div>').join('') || '<p class="dica">Nenhum passo.</p>',
                sh => {
                    sh.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => {
                        const op = b.dataset.p[0], i = parseInt(b.dataset.p.slice(1), 10), p = m.programa.passos[i];
                        if (op === '-' && p.ms != null) p.ms = Math.max(300, p.ms - 250);
                        if (op === '+') p.ms = (p.ms == null ? 3000 : p.ms) + 250;
                        if (op === 'x') {
                            const y0 = sh.scrollTop;
                            if (!(await confirmar('Apagar o passo ' + (i + 1) + '?', 'A linha deixa de aparecer nesse momento da rolagem.', 'Apagar'))) { abrirPassos(); const v = document.getElementById('sheet'); if (v) v.scrollTop = y0; return; }
                            m.programa.passos.splice(i, 1);
                        }
                        await DB.atualizarMusica(m.id, { programa: m.programa });
                        if (prog) { prog.destruir(); prog = null; }
                        const y = sh.scrollTop; abrirPassos(); const novo = document.getElementById('sheet'); if (novo) novo.scrollTop = y;
                    });
                }
            );
        }

        function iniciarRolagem() {
            if (m.rolagemProg) { iniciarProg(); return; }
            if (m.rolagemBpm) { iniciarBpm(st.fraseBpm >= 0 ? st.fraseBpm : 0); return; }
            st.rolando = true; st.ultimoT = 0; st.acumulado = 0; st.raf = requestAnimationFrame(passo); desenharDoca(tomAtual(m, st.semitons)); manterTelaLigada(true); }
        function pararRolagem() { pararPulsoProg(); if (tocador) tocador.parar(); if (prog) prog.parar(); st.rolando = false; cancelAnimationFrame(st.raf); desenharDoca(tomAtual(m, st.semitons)); }
        // Arrastar a cifra com o dedo NÃO desliga a rolagem: ela só espera o dedo sair (ver passo() e UI.usuarioRolando).
        // toqueMoveu evita que um arrasto conte como toque num acorde ou numa frase.
        // Segurar o dedo parado (para a rolagem esperar) também não conta: ao soltar, não abre o diagrama do acorde.
        // AJUSTAR: a partir de quantos ms o toque deixa de ser "toque" e vira "segurar".
        const TOQUE_LONGO_MS = 450;
        let toqueMoveu = false, toqueT0 = 0;
        conteudo.addEventListener('touchstart', () => { toqueMoveu = false; toqueT0 = performance.now(); }, { passive: true });
        conteudo.addEventListener('touchmove', () => { toqueMoveu = true; }, { passive: true });
        conteudo.addEventListener('touchend', () => { if (performance.now() - toqueT0 > TOQUE_LONGO_MS) toqueMoveu = true; }, { passive: true });

        /* ---------- Pinça: dois dedos aumentam / diminuem a cifra ---------- */
        let pinca = null; // { d0, fonte0, cy, ancora }
        const distDedos = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        conteudo.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 2) return;
            toqueMoveu = true;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            pinca = { d0: distDedos(e.touches), fonte0: st.fonteEf || pr.fonte, cy, ancora: window.scrollY + cy, ultima: st.fonteEf || pr.fonte };
        }, { passive: true });
        conteudo.addEventListener('touchmove', (e) => {
            if (!pinca || e.touches.length !== 2) return;
            e.preventDefault();
            const nova = Math.max(70, Math.min(limiteFonte(), Math.round(pinca.fonte0 * distDedos(e.touches) / pinca.d0)));
            if (nova === pinca.ultima) return;
            const razao = nova / pinca.ultima; pinca.ultima = nova;
            pr.fonte = nova;
            if (aplicarFonte()) { pinca.ancora = window.scrollY + pinca.cy; return; } // a quebra de linha mudou: já reposicionou
            // mantém o trecho que está entre os dedos no mesmo lugar da tela
            pinca.ancora *= razao;
            window.scrollTo(0, pinca.ancora - pinca.cy);
        }, { passive: false });
        const fimPinca = (e) => {
            if (!pinca || e.touches.length >= 2) return;
            pr = salvarPrefs({ fonte: pinca.ultima }); pinca = null;
            if (st.rolando) { st.acumulado = 0; st.ultimoT = 0; }
            setTimeout(() => { toqueMoveu = false; }, 250);
        };
        conteudo.addEventListener('touchend', fimPinca, { passive: true });
        conteudo.addEventListener('touchcancel', fimPinca, { passive: true });

        /* ---------- Tela sempre ligada ---------- */
        let trava = null;
        async function manterTelaLigada(ligar) {
            try {
                if (ligar && !trava && 'wakeLock' in navigator) { trava = await navigator.wakeLock.request('screen'); trava.addEventListener('release', () => { trava = null; }); }
                if (!ligar && trava) { await trava.release(); trava = null; }
            } catch (e) { /* navegador não deixou: tudo bem */ }
        }
        const aoVoltarVisivel = () => { if (document.visibilityState === 'visible') manterTelaLigada(true); };
        document.addEventListener('visibilitychange', aoVoltarVisivel);
        manterTelaLigada(true);

        /* ---------- Modo palco ---------- */
        function alternarPalco() {
            st.palco = !st.palco;
            document.body.classList.toggle('palco', st.palco);
            setTimeout(aplicarFonte, 80);
            try {
                if (st.palco && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
                else if (!st.palco && document.fullscreenElement) document.exitFullscreen();
            } catch (e) { /* sem tela cheia */ }
        }

        /* ---------- Ajustes ---------- */
        function abrirAjustes() {
            const linhaAj = (rotulo, ctrl) => '<div class="ajuste"><span>' + rotulo + '</span><div class="aj-ctrl">' + ctrl + '</div></div>';
            const bemolTxt = { auto: 'Auto', sustenido: '♯', bemol: '♭' }[pr.bemol] || 'Auto';
            abrirSheet(
                '<h3 style="margin:0 0 6px">Ajustes da cifra</h3>' +
                linhaAj('Capotraste', '<button class="mini-bt" data-aj="capo-">−</button><span class="aj-val">' + (st.capo ? st.capo + 'ª' : 'Sem capo') + '</span><button class="mini-bt" data-aj="capo+">+</button>') +
                linhaAj('Velocidade da rolagem', '<button class="mini-bt" data-aj="vel-">−</button><span class="aj-val">' + pr.velocidade + '</span><button class="mini-bt" data-aj="vel+">+</button>') +
                linhaAj('Tamanho da letra', '<button class="mini-bt" data-aj="fonte-">−</button><span class="aj-val">' + (st.fonteEf || pr.fonte) + '%</span><button class="mini-bt" data-aj="fonte+">+</button>') +
                linhaAj('Sustenido / bemol', '<button class="chip" data-aj="bemol">' + bemolTxt + '</button>') +
                linhaAj('Simplificar acordes', '<button class="chave ' + (pr.simplificar ? 'on' : '') + '" data-aj="simplificar" aria-label="Simplificar"></button>') +
                (window.innerWidth >= 1200 ? linhaAj('Duas colunas', '<button class="chave ' + (pr.duasColunas ? 'on' : '') + '" data-aj="colunas" aria-label="Duas colunas"></button>') : '') +
                linhaAj('Rolagem por BPM', '<button class="chave ' + (m.rolagemBpm ? 'on' : '') + '" data-aj="bpm-modo" aria-label="Rolagem por BPM"></button>') +
                (m.rolagemBpm
                    ? linhaAj('BPM', '<button class="mini-bt" data-aj="bpm-">−</button><button class="aj-val" data-aj="bpm-digitar" style="min-width:52px">' + (m.bpm || '—') + '</button><button class="mini-bt" data-aj="bpm+">+</button>') +
                      linhaAj('Compasso', '<span class="aj-val" style="min-width:auto">' + esc(m.compasso || '4/4') + '</span>') +
                      linhaAj('Compassos por frase', '<button class="mini-bt" data-aj="cpf-">−</button><span class="aj-val">' + RolagemBPM.compassosDaFrase(m, 'padrao') + '</span><button class="mini-bt" data-aj="cpf+">+</button>') +
                      linhaAj('Clique sonoro', '<button class="chave ' + (pr.cliqueBpm ? 'on' : '') + '" data-aj="clique" aria-label="Clique sonoro"></button>') +
                      '<p class="dica" style="margin:0 4px 6px">Toque numa frase para pular para ela. Segure uma frase para mudar os compassos só dela.</p>'
                    : '') +
                linhaAj('Rolagem programada', '<button class="chave ' + (m.rolagemProg ? 'on' : '') + '" data-aj="prog-modo" aria-label="Rolagem programada"></button>') +
                (m.rolagemProg
                    ? linhaAj('Avanço dos passos', '<button class="chip" data-aj="prog-avanco">' + (m.programa && m.programa.avanco === 'manual' ? 'Manual (pedal)' : 'Automático') + '</button>') +
                      '<button class="op" data-aj="prog-gravar">' + icone('play') + 'Gravar ouvindo a música</button>' +
                      '<button class="op" data-aj="prog-bpm">' + icone('relogio') + 'Gerar pelo BPM</button>' +
                      (nPassos() ? '<button class="op" data-aj="prog-editar">' + icone('lista') + 'Ver / ajustar os passos<span class="op-dir">' + nPassos() + '</span></button><button class="op perigo" data-aj="prog-limpar">' + icone('lixeira') + 'Limpar a programação</button>' : '') +
                      '<p class="dica" style="margin:0 4px 6px">Você escolhe a linha que sobe em cada passo: pelo tempo da música (BPM) ou ouvindo e pisando o pedal. No avanço manual, o pedal (ou os botões da barra) passa de um passo para o outro.</p>'
                    : '') +
                linhaAj('Modo baterista', '<button class="chave ' + (pr.baterista ? 'on' : '') + '" data-aj="baterista" aria-label="Modo baterista"></button>') +
                // js/voz.js: tom para a sua voz (item 7) e capotraste mais fácil (item 8)
                '<button class="op" data-aj="voz">' + icone('microfone') + 'Tom para a minha voz<span class="op-dir">' + (m.extensao ? 'extensão gravada' : 'sugere o tom') + '</span></button>' +
                '<button class="op" data-aj="capo-facil">' + icone('violao') + 'Capotraste mais fácil<span class="op-dir">menos pestanas</span></button>' +
                '<button class="op" data-aj="palco">' + icone('palco') + (st.palco ? 'Sair do modo palco' : 'Modo palco (tela cheia)') + '</button>' +
                '<button class="op" data-aj="config">' + icone('ajustes') + 'Pedal e MIDI</button>' +
                '<button class="op" data-aj="original">' + icone('nota') + 'Voltar ao tom original' + (m.tom ? '<span class="op-dir">' + esc(m.tom) + '</span>' : '') + '</button>',
                sh => sh.querySelectorAll('[data-aj]').forEach(b => b.onclick = () => {
                    const a = b.dataset.aj;
                    if (a === 'capo-' || a === 'capo+') { st.capo = Math.max(0, Math.min(12, st.capo + (a === 'capo+' ? 1 : -1))); DB.atualizarMusica(m.id, { capo: st.capo }); m.capo = st.capo; }
                    if (a === 'vel-' || a === 'vel+') pr = salvarPrefs({ velocidade: Math.max(1, Math.min(10, pr.velocidade + (a === 'vel+' ? 1 : -1))) });
                    if (a === 'fonte-' || a === 'fonte+') maisFonte(a === 'fonte+' ? 10 : -10);
                    if (a === 'bemol') pr = salvarPrefs({ bemol: { auto: 'sustenido', sustenido: 'bemol', bemol: 'auto' }[pr.bemol] || 'auto' });
                    if (a === 'simplificar') pr = salvarPrefs({ simplificar: !pr.simplificar });
                    if (a === 'colunas') pr = salvarPrefs({ duasColunas: !pr.duasColunas });
                    if (a === 'baterista') { pr = salvarPrefs({ baterista: !pr.baterista }); toast(pr.baterista ? 'Modo baterista: só as partes da música' : 'Cifra completa'); }
                    if (a === 'bpm-modo') {
                        m.rolagemBpm = !m.rolagemBpm; DB.atualizarMusica(m.id, { rolagemBpm: m.rolagemBpm });
                        if (m.rolagemBpm && m.rolagemProg) { m.rolagemProg = false; DB.atualizarMusica(m.id, { rolagemProg: false }); if (prog) { prog.destruir(); prog = null; } if (st.rolando) pararRolagem(); }
                        if (!m.rolagemBpm) { if (st.rolando) pararRolagem(); if (tocador) { tocador.destruir(); tocador = null; } st.fraseBpm = -1; }
                        else if (!m.bpm) toast('Defina o BPM logo abaixo');
                    }
                    if (a === 'bpm-' || a === 'bpm+') { m.bpm = Math.max(20, Math.min(300, (m.bpm || 100) + (a === 'bpm+' ? 1 : -1))); DB.atualizarMusica(m.id, { bpm: m.bpm }); }
                    if (a === 'bpm-digitar') {
                        fecharSheet();
                        perguntar('BPM da música (20 a 300)', m.bpm || '', 'Salvar').then(v => {
                            if (v === null) return;
                            const n = parseInt(v, 10);
                            if (n >= 20 && n <= 300) { m.bpm = n; DB.atualizarMusica(m.id, { bpm: n }); } else toast('Use um número de 20 a 300');
                            desenhar(); abrirAjustes();
                        });
                        return;
                    }
                    if (a === 'cpf-' || a === 'cpf+') {
                        const cm = m.compassosPorFrase = m.compassosPorFrase || {};
                        cm.padrao = Math.max(1, Math.min(8, RolagemBPM.compassosDaFrase(m, 'padrao') + (a === 'cpf+' ? 1 : -1)));
                        DB.atualizarMusica(m.id, { compassosPorFrase: cm });
                    }
                    if (a === 'clique') { pr = salvarPrefs({ cliqueBpm: !pr.cliqueBpm }); if (tocador) tocador.definirClique(pr.cliqueBpm); }
                    if (a === 'prog-modo') {
                        if (!m.rolagemProg) { const mud = ativarProg(); DB.atualizarMusica(m.id, mud); if (!nPassos()) toast('Agora grave ou gere a programação'); }
                        else { m.rolagemProg = false; if (prog) { prog.destruir(); prog = null; } if (st.rolando) pararRolagem(); DB.atualizarMusica(m.id, { rolagemProg: false }); }
                    }
                    if (a === 'prog-avanco') {
                        const pg = m.programa = m.programa || { passos: [], origem: '', avanco: 'auto' };
                        pg.avanco = pg.avanco === 'manual' ? 'auto' : 'manual'; DB.atualizarMusica(m.id, { programa: pg });
                    }
                    if (a === 'prog-gravar') { fecharSheet(); comecarGravacao(); return; }
                    if (a === 'prog-bpm') { fecharSheet(); pedirAgrupar(); return; }
                    if (a === 'prog-editar') { fecharSheet(); abrirPassos(); return; }
                    if (a === 'prog-limpar') {
                        fecharSheet();
                        confirmar('Limpar a programação?', 'Os passos gravados desta música serão apagados.', 'Limpar').then(ok => {
                            if (!ok) return;
                            m.programa = null; st.progPasso = 0; if (prog) { prog.destruir(); prog = null; }
                            DB.atualizarMusica(m.id, { programa: null }); toast('Programação apagada'); desenhar();
                        });
                        return;
                    }
                    if (a === 'config') { fecharSheet(); ir('#/config'); return; }
                    if (a === 'palco') { fecharSheet(); alternarPalco(); return; }
                    if (a === 'voz') {
                        fecharSheet();
                        Voz.abrirTom(m, {
                            semitons: st.semitons,
                            aplicar: (s) => { st.semitons = s; desenhar(); salvarTom(); },
                            salvarExtensao: (ext) => DB.atualizarMusica(m.id, { extensao: ext }),
                        });
                        return;
                    }
                    if (a === 'capo-facil') {
                        fecharSheet();
                        Voz.abrirCapo(m, {
                            semitons: st.semitons, capo: st.capo,
                            aplicar: (c) => { st.capo = c; m.capo = c; DB.atualizarMusica(m.id, { capo: c }); desenhar(); },
                        });
                        return;
                    }
                    if (a === 'original') { fecharSheet(); transpor(0); return; }
                    desenhar(); abrirAjustes(); // redesenha o painel com os valores novos
                })
            );
        }

        /* ---------- Diagrama ao tocar no acorde ---------- */
        function mostrarAcorde(ac) {
            const notas = CifraMotor.notasDoAcorde(ac) || [];
            abrirSheet(
                '<div class="sh-acorde">' + esc(ac) + '</div><div class="sh-notas">' + esc(notas.join(' · ')) + '</div>' +
                '<div class="diagramas"><div class="dg">' + CifraMotor.svgViolao(ac) + '<small>Violão</small></div>' +
                '<div class="dg">' + CifraMotor.svgTeclado(ac) + '<small>Teclado</small></div></div>'
            );
        }

        /* ---------- Navegação no repertório ---------- */
        function irPara(n) {
            if (!rep) return;
            if (n < 0 || n >= posicoes.length) { toast(n < 0 ? 'Esta é a primeira música' : 'Fim do repertório'); return; }
            if (navigator.vibrate) navigator.vibrate(20);
            location.replace('#/cifra/' + posicoes[n].musicaId + '?rep=' + rep.id + '&i=' + n + (st.rolando ? '&rolar=1' : ''));
        }
        if (rep) {
            $('bt-ant').onclick = () => irPara(idx - 1);
            $('bt-prox').onclick = () => irPara(idx + 1);
            // Deslizar para os lados troca de música. Para não trocar por acidente no meio do show, NÃO vale:
            //  - com dois dedos (pinça): antes, soltar um dedo da pinça podia pular de música;
            //  - quando a cifra é mais larga que a tela (aí o deslize serve para ler o fim da linha);
            //  - em gesto lento (mais de 0,6 s), que é leitura/arrasto e não um "peteleco".
            // AJUSTAR: distância mínima (px) e tempo máximo (ms) do deslize.
            const SWIPE_MIN_PX = 90, SWIPE_MAX_MS = 600;
            let sw = null; // { id, x, y, t }
            conteudo.addEventListener('touchstart', e => {
                if (e.touches.length !== 1) { sw = null; return; }
                const larga = !conteudo.classList.contains('quebra') && conteudo.scrollWidth > conteudo.clientWidth + 2;
                if (larga) { sw = null; return; }
                const t0 = e.touches[0];
                sw = { id: t0.identifier, x: t0.clientX, y: t0.clientY, t: performance.now() };
            }, { passive: true });
            conteudo.addEventListener('touchend', e => {
                const s = sw; sw = null;
                if (!s || e.touches.length) return;
                const t1 = [...e.changedTouches].find(t => t.identifier === s.id); if (!t1) return;
                const dx = t1.clientX - s.x, dy = t1.clientY - s.y;
                if (performance.now() - s.t > SWIPE_MAX_MS) return;
                if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dy) < 50) irPara(dx < 0 ? idx + 1 : idx - 1);
            }, { passive: true });
            conteudo.addEventListener('touchcancel', () => { sw = null; }, { passive: true });
        }

        /* ---------- Eventos ---------- */
        $('cifra-info').onclick = $('doca').onclick = (e) => {
            const b = e.target.closest('[data-d]'); if (!b) return;
            const d = b.dataset.d;
            if (d === 'custom') { if (customLongo) { customLongo = false; return; } executarCustom(); return; }
            if (d === 'tom-') transpor(-1);
            if (d === 'tom+') transpor(1);
            if (d === 'tom0') { if (st.semitons) { transpor(0); toast('Tom original'); } }
            if (d === 'fonte-' || d === 'fonte+') maisFonte(d === 'fonte+' ? 10 : -10);
            if (d === 'vel-' || d === 'vel+') { pr = salvarPrefs({ velocidade: Math.max(1, Math.min(10, pr.velocidade + (d === 'vel+' ? 1 : -1))) }); desenharDoca(tomAtual(m, st.semitons)); }
            if (d === 'bpm-' || d === 'bpm+') { m.bpm = Math.max(20, Math.min(300, (m.bpm || 100) + (d === 'bpm+' ? 1 : -1))); DB.atualizarMusica(m.id, { bpm: m.bpm }); desenharDoca(tomAtual(m, st.semitons)); }
            if (d === 'passo-') pegarProg().anterior();
            if (d === 'passo+') pegarProg().proximo();
            if (d === 'rolar') st.rolando ? pararRolagem() : iniciarRolagem();
            if (d === 'ajustes') abrirAjustes();
        };
        /* ---- Botão personalizável: toque = faz a ação; segurar = escolher outra ---- */
        let customLongo = false, customTimer = 0;
        function executarCustom() {
            const a = pr.botaoAcao;
            if (!a || a === 'botao-custom' || a === 'botao-trocar') { escolherCustom(); return; }
            Controle.executar(a);
        }
        function trocarCustom() {
            const L = Controle.ACOES.filter(x => x.id !== 'botao-custom' && x.id !== 'botao-trocar');
            const i = L.findIndex(x => x.id === pr.botaoAcao);
            pr = salvarPrefs({ botaoAcao: L[(i + 1) % L.length].id }); desenharDoca(tomAtual(m, st.semitons));
            toast('Botão: ' + Controle.nomeAcao(pr.botaoAcao));
        }
        function escolherCustom() {
            const L = Controle.ACOES.filter(x => x.id !== 'botao-custom' && x.id !== 'botao-trocar');
            abrirSheet('<h3 class="sheet-tit">O que o botão faz</h3><div class="lista">' + L.map(x =>
                '<button class="op" data-ac-cust="' + x.id + '">' + esc(x.nome) + (x.id === pr.botaoAcao ? '<span class="op-dir">✓</span>' : '') + '</button>').join('') + '</div>',
                (sh) => sh.addEventListener('click', ev => {
                    const b = ev.target.closest('[data-ac-cust]'); if (!b) return;
                    pr = salvarPrefs({ botaoAcao: b.dataset.acCust }); fecharSheet(); desenharDoca(tomAtual(m, st.semitons));
                    toast('Botão: ' + Controle.nomeAcao(pr.botaoAcao));
                }));
        }
        $('doca').addEventListener('pointerdown', ev => {
            if (!ev.target.closest('[data-d="custom"]')) return;
            customLongo = false; clearTimeout(customTimer);
            customTimer = setTimeout(() => { customLongo = true; escolherCustom(); }, 600);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => $('doca').addEventListener(n, () => clearTimeout(customTimer)));

        const clicarAcorde = (e) => { const a = e.target.closest('[data-ac],[data-acorde]'); if (a && !toqueMoveu) mostrarAcorde(a.dataset.ac || a.dataset.acorde); };
        conteudo.addEventListener('click', clicarAcorde);
        $('faixa-acordes').addEventListener('click', clicarAcorde);

        /* ---- Rolagem por BPM: tocar numa frase pula para ela; segurar ajusta os compassos dela ---- */
        function abrirFrase(n) {
            const linhas = [...conteudo.querySelectorAll('[data-frase="' + n + '"]')];
            const letra = ((linhas.find(l => l.classList.contains('l-letra')) || linhas[0] || {}).textContent || '').trim();
            abrirSheet(
                '<h3 style="margin:0 0 4px">Frase ' + (n + 1) + '</h3><p class="dica" style="margin:0 0 8px">' + esc(letra.slice(0, 70)) + '</p>' +
                '<div class="ajuste"><span>Compassos nesta frase</span><div class="aj-ctrl"><button class="mini-bt" data-f="-">−</button><span class="aj-val">' + RolagemBPM.compassosDaFrase(m, n) + '</span><button class="mini-bt" data-f="+">+</button></div></div>' +
                '<button class="op" data-f="padrao">' + icone('nota') + 'Usar o padrão (' + RolagemBPM.compassosDaFrase(m, 'padrao') + ')</button>' +
                '<button class="op" data-f="daqui">' + icone('play') + 'Começar daqui</button>',
                sh => sh.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
                    const k = b.dataset.f, cm = m.compassosPorFrase = m.compassosPorFrase || {};
                    if (k === 'daqui') { fecharSheet(); iniciarBpm(n); return; }
                    if (k === 'padrao') delete cm[n];
                    else cm[n] = Math.max(1, Math.min(16, RolagemBPM.compassosDaFrase(m, n) + (k === '+' ? 1 : -1)));
                    DB.atualizarMusica(m.id, { compassosPorFrase: cm }); abrirFrase(n);
                })
            );
        }
        let tLongo = null;
        const cancelarLongo = () => { clearTimeout(tLongo); tLongo = null; };
        conteudo.addEventListener('pointerdown', (e) => {
            if (!m.rolagemBpm || e.target.closest('[data-ac]')) return;
            const el = e.target.closest('[data-frase]'); if (!el) return;
            const n = parseInt(el.dataset.frase, 10);
            tLongo = setTimeout(() => { tLongo = null; st.ignoraClique = true; abrirFrase(n); }, 550);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => conteudo.addEventListener(ev, cancelarLongo));
        conteudo.addEventListener('contextmenu', (e) => { if (m.rolagemBpm) e.preventDefault(); });
        conteudo.addEventListener('click', (e) => {
            if (!m.rolagemBpm || toqueMoveu) return;
            if (st.ignoraClique) { st.ignoraClique = false; return; }
            if (e.target.closest('[data-ac]')) return;
            const el = e.target.closest('[data-frase]'); if (!el) return;
            pegarTocador().irPara(parseInt(el.dataset.frase, 10));
        });
        $('bt-curtir').onclick = async () => { m.curtida = !m.curtida; await DB.atualizarMusica(m.id, { curtida: m.curtida }); desenhar(); toast(m.curtida ? 'Adicionada às Curtidas' : 'Removida das Curtidas'); };
        $('bt-menu').onclick = () => menuMusica(m.id);

        /* ---- Lista do repertório durante o show (com busca) ---- */
        function abrirSetlist(focarBusca) {
            if (!rep) { location.hash = '#/buscar'; return; }
            const linhas = (f) => {
                let n = 0;
                return rep.itens.map(it => {
                    if (it.tipo === 'bloco') return f ? '' : '<div class="bloco-rep sl-bloco"><span class="bl-nome">' + esc(it.nome || 'Bloco') + '</span></div>';
                    const k = n++, mu = musicasRep[it.musicaId];
                    if (!mu || (f && !normal((k + 1) + ' ' + mu.titulo + ' ' + mu.artista).includes(normal(f)))) return '';
                    return '<button class="op sl-item' + (k === idx ? ' atual' : '') + '" data-ir="' + k + '"><span class="num-op">' + (k + 1) + '</span>' +
                        capaMusica(Object.assign({}, mu, { semitons: it.semitons }), 'p40') +
                        '<span class="op-txt">' + esc(mu.titulo) + '<br><small>' + esc(mu.artista) + ((mu.cifra || '').trim() ? '' : ' · sem cifra') + '</small></span></button>';
                }).join('') || '<p class="dica">Nenhuma música encontrada.</p>';
            };
            abrirSheet(
                '<h3 style="margin:0 0 8px">' + esc(rep.nome) + ' <small style="color:var(--texto-2);font-weight:500">' + posicoes.length + ' músicas</small></h3>' +
                '<input class="entrada" id="sl-busca" type="search" placeholder="Pesquisar no repertório (nome ou nº)" autocomplete="off" style="margin-bottom:6px">' +
                '<div id="sl-lista">' + linhas('') + '</div>',
                sh => {
                    const l = sh.querySelector('#sl-lista'), b = sh.querySelector('#sl-busca');
                    b.oninput = () => { l.innerHTML = linhas(b.value.trim()); };
                    b.onkeydown = (e) => { if (e.key === 'Enter') { const p1 = l.querySelector('[data-ir]'); if (p1) p1.click(); } };
                    l.onclick = (e) => { const x = e.target.closest('[data-ir]'); if (!x) return; const k = parseInt(x.dataset.ir, 10); fecharSheet(); if (k !== idx) irPara(k); };
                    const at = l.querySelector('.atual'); if (at && !focarBusca) at.scrollIntoView({ block: 'center' });
                    if (focarBusca) setTimeout(() => b.focus(), 60);
                }
            );
        }
        if (rep) { $('bt-lista').onclick = () => abrirSetlist(false); $('bt-busca-rep').onclick = () => abrirSetlist(true); }

        /* ---- Pedal / MIDI / teclado: o que cada ação faz nesta tela (ver js/controle.js) ---- */
        const mudarFonte = (d) => maisFonte(d);
        const ctxControle = {
            irPara: (pc) => { if (rep) { toast('Música nº ' + (pc + 1)); irPara(pc); } },
            acoes: {
                'musica-proxima': () => { if(ShowProgramado.avancar())return; if (rep) irPara(idx + 1); else toast('Abra a música por um repertório'); },
                'musica-anterior': () => { if (rep) irPara(idx - 1); else toast('Abra a música por um repertório'); },
                'rolagem': () => { if (st.gravando) return; st.rolando ? pararRolagem() : iniciarRolagem(); },
                'tela-descer': () => {
                    if (st.gravando) { if (grav.estado() !== 'gravando') grav.comecar(); grav.marcar(); return; }
                    if (m.rolagemProg && nPassos()) { pegarProg().proximo(); return; }
                    Controle.rolarTela(1);
                },
                'tela-subir': () => {
                    if (st.gravando) { grav.desfazer(); return; }
                    if (m.rolagemProg && nPassos()) { pegarProg().anterior(); return; }
                    Controle.rolarTela(-1);
                },
                'rolagem-parar': () => { if (st.rolando) pararRolagem(); },
                'frase-proxima': () => { if (st.gravando) { if (grav.estado() !== 'gravando') grav.comecar(); grav.marcar(); return; } if (m.rolagemProg && nPassos()) { pegarProg().proximo(); return; } if (!m.rolagemBpm) { toast('Ligue a rolagem por BPM nos ajustes'); return; } pegarTocador().irPara(st.fraseBpm + 1); },
                'frase-anterior': () => { if (st.gravando) { grav.desfazer(); return; } if (m.rolagemProg && nPassos()) { pegarProg().anterior(); return; } if (!m.rolagemBpm) { toast('Ligue a rolagem por BPM nos ajustes'); return; } pegarTocador().irPara(Math.max(0, st.fraseBpm - 1)); },
                'buscar': () => abrirSetlist(true),
                'tom-mais': () => transpor(1),
                'tom-menos': () => transpor(-1),
                'tom-original': () => { transpor(0); toast('Tom original'); },
                'fonte-mais': () => mudarFonte(10),
                'fonte-menos': () => mudarFonte(-10),
                'palco': () => alternarPalco(),
                'curtir': () => $('bt-curtir').click(),
                'botao-custom': () => executarCustom(),
                'botao-trocar': () => trocarCustom(),
            },
        };
        Controle.registrar(ctxControle);

        /* ---- Progresso do show: barra fininha na faixa do repertório (estimativa: ~4 min por música) ---- */
        function atualizarProgShow() {
            const barra = $('prog-show-i'); if (!barra) return;
            const total = posicoes.length || 1;
            const alt = document.documentElement.scrollHeight - window.innerHeight;
            const frac = alt > 0 ? Math.max(0, Math.min(1, window.scrollY / alt)) : 0;
            const feito = (idx + frac) / total;
            barra.style.width = (feito * 100).toFixed(1) + '%';
            const falta = Math.max(0, Math.round(posicoes.slice(idx).reduce((s,it,k)=>s+(Number(musicasRep[it.musicaId]?.duracaoMin)||4)*(k===0?1-frac:1),0)));
            const txt = (falta >= 60 ? Math.floor(falta / 60) + 'h' + String(falta % 60).padStart(2, '0') : falta + ' min');
            $('prog-show').title = 'Faltam ~' + txt + ' de show'; $('prog-show').dataset.falta = txt;
        }
        if (rep) { window.addEventListener('scroll', atualizarProgShow, { passive: true }); atualizarProgShow(); }

        aplicarFonte();
        desenhar();
        const aoRedimensionar = () => { aplicarFonte(); };
        window.addEventListener('resize', aoRedimensionar);
        window.scrollTo(0, 0);
        if (q.rolar) setTimeout(iniciarRolagem, 400);
        const limparShow=ShowProgramado.montar({musica:m,rep,idx,posicoes,container:conteudo,gravar:comecarGravacao,parar:pararRolagem,proximo:rep&&idx<posicoes.length-1?()=>{const it=posicoes[idx+1];location.hash="#/cifra/"+it.musicaId+"?rep="+rep.id+"&i="+(idx+1);}:null});

        // Limpeza ao sair da tela
        return () => {
            if (limparProx) limparProx();
            if (limparBat) limparBat();
            limparShow();
            pararRolagem();
            Aprender.fechar();
            if (tocador) { tocador.destruir(); tocador = null; }
            if (prog) { prog.destruir(); prog = null; }
            if (grav) { grav.cancelar(); grav = null; }
            const gvEl = document.getElementById('gravador'); if (gvEl) gvEl.remove();
            manterTelaLigada(false);
            document.removeEventListener('visibilitychange', aoVoltarVisivel);
            window.removeEventListener('resize', aoRedimensionar);
            window.removeEventListener('scroll', atualizarProgShow);
            Controle.liberar(ctxControle);
            document.body.classList.remove('tela-cifra', 'palco');
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }

    const CURTO = { 'musica-proxima': 'Próxima', 'musica-anterior': 'Anterior', 'tela-descer': 'Descer', 'tela-subir': 'Subir', 'tela-topo': 'Topo',
        'rolagem': 'Rolar', 'rolagem-parar': 'Parar', 'rolagem-travar': 'Travar', 'frase-proxima': 'Frase +', 'frase-anterior': 'Frase −',
        'buscar': 'Buscar', 'tom-mais': 'Tom +', 'tom-menos': 'Tom −', 'tom-original': 'Tom orig.', 'fonte-mais': 'A+', 'fonte-menos': 'A−', 'palco': 'Palco', 'curtir': 'Curtir' };
    const nomeCurto = (id) => CURTO[id] || 'Botão';

    /* ---------- Quebra de linha por palavra (letra grande) ----------
       Cada par "linha de acordes + linha de letra" vira um bloco que quebra nas palavras:
       o acorde fica em cima da sua sílaba e uma palavra nunca é partida no meio. */
    function palavrasDaFrase(acEl, letraEl) {
        const letra = letraEl ? letraEl.textContent : '';
        const marcas = []; let col = 0;
        acEl.childNodes.forEach(nd => {
            const t = nd.textContent;
            if (nd.nodeType === 3) { for (const mm of t.matchAll(/\S+/g)) marcas.push({ col: col + mm.index, txt: mm[0], ac: null }); }
            else marcas.push({ col, txt: t, ac: nd.dataset && nd.dataset.ac ? nd.dataset.ac : null });
            col += t.length;
        });
        const segs = [];
        if (marcas.length && marcas[0].col > 0) segs.push({ m: null, t: letra.slice(0, marcas[0].col) });
        if (!marcas.length) segs.push({ m: null, t: letra });
        marcas.forEach((mk, i) => segs.push({ m: mk, t: letra.slice(mk.col, i + 1 < marcas.length ? marcas[i + 1].col : undefined) }));
        const atomos = []; let pend = null;
        const solta = () => { if (pend) { atomos.push({ m: pend, t: '' }); pend = null; } };
        for (const sg of segs) {
            if (sg.m) { solta(); pend = sg.m; }
            const partes = sg.t.match(/\s+|\S+/g) || [];
            if (!partes.length) { solta(); continue; }
            for (const p of partes) {
                if (/^\s/.test(p)) atomos.push({ esp: true });
                else { atomos.push({ m: pend, t: p }); pend = null; }
            }
        }
        solta();
        const palavras = []; let atual = [];
        atomos.forEach(a => { if (a.esp) { if (atual.length) palavras.push(atual); atual = []; } else atual.push(a); });
        if (atual.length) palavras.push(atual);
        return palavras;
    }
    const larguraPalavra = (w) => w.reduce((s, a) => s + Math.max(a.m ? a.m.txt.length + 1 : 0, a.t.length), 0);
    function blocoReflow(palavras, n) {
        const div = document.createElement('div');
        div.className = 'l l-letra l-reflow'; div.dataset.frase = n;
        palavras.forEach((w, i) => {
            if (i) div.appendChild(document.createTextNode(' '));
            const sw = document.createElement('span');
            sw.className = 'rf-w' + (w.every(a => !a.t) ? ' so-ac' : '');
            w.forEach(a => {
                const sa = document.createElement('span'); sa.className = 'rf-a';
                const c = document.createElement('span'); c.className = 'rf-c';
                if (a.m && a.m.ac) { const b = document.createElement('b'); b.className = 'ac'; b.dataset.ac = a.m.ac; b.textContent = a.m.txt; c.appendChild(b); }
                else if (a.m) { c.textContent = a.m.txt; c.classList.add('rf-obs'); }
                c.appendChild(document.createTextNode(' '));
                const t = document.createElement('span'); t.className = 'rf-t'; t.textContent = a.t;
                sa.appendChild(c); sa.appendChild(t); sw.appendChild(sa);
            });
            div.appendChild(sw);
        });
        return div;
    }
    /* Mede a palavra mais larga (em colunas) e, se aplicar, troca os pares por blocos que quebram. */
    function reflowCifra(container, aplicar) {
        let maxPalavra = 0;
        [...container.querySelectorAll('.l-acordes')].forEach(ac => {
            let letra = ac.nextElementSibling;
            if (!(letra && letra.classList.contains('l-letra') && letra.dataset.frase === ac.dataset.frase)) letra = null;
            const palavras = palavrasDaFrase(ac, letra);
            palavras.forEach(w => { maxPalavra = Math.max(maxPalavra, larguraPalavra(w)); });
            if (aplicar) { ac.replaceWith(blocoReflow(palavras, ac.dataset.frase)); if (letra) letra.remove(); }
        });
        container.querySelectorAll('.l-letra:not(.l-reflow)').forEach(l => l.textContent.split(/\s+/).forEach(w => { maxPalavra = Math.max(maxPalavra, w.length); }));
        return maxPalavra;
    }

    /* Agrupa linha de acordes + linha de letra numa "frase" (data-frase=N).
       Usado pela futura rolagem por BPM. */
    function marcarFrases(container) {
        let n = -1, anteriorAcordes = false;
        container.querySelectorAll('.l').forEach(el => {
            if (el.classList.contains('l-acordes')) { n++; el.dataset.frase = n; anteriorAcordes = true; }
            else if (el.classList.contains('l-letra')) { if (!anteriorAcordes) n++; el.dataset.frase = n; anteriorAcordes = false; }
            else anteriorAcordes = false;
        });
    }

    /* =================================================================
       REPERTÓRIO
       ================================================================= */
    async function repertorio(p) {
        const r = await DB.pegarRepertorio(p.id);
        if (!r) { toast('Repertório não encontrado'); ir('#/biblioteca'); return; }
        r.abertoEm = Date.now(); await DB.salvarRepertorio(r);
        const ms = await DB.listarMusicas();
        const porId = Object.fromEntries(ms.map(m => [m.id, m]));
        r.itens = r.itens.filter(i => i.tipo === 'bloco' || porId[i.musicaId]); // ignora músicas apagadas
        const pal = UI.paleta('rep' + r.nome);
        const nMus = r.itens.filter(i => i.tipo === 'musica').length;
        const nSem = r.itens.filter(i => i.tipo === 'musica' && !(porId[i.musicaId].cifra || '').trim()).length;

        tela().innerHTML =
            '<div class="rep-cabeca" style="--c1:' + pal[0] + '"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button>' +
            capaRep(r) + '<h1>' + esc(r.nome) + '</h1>' +
            '<div class="rep-sub">' + (r.descricao ? esc(r.descricao) + ' · ' : '') + nMus + ' música' + (nMus === 1 ? '' : 's') + (nSem ? ' · ' + nSem + ' sem cifra' : '') + '</div>' +
            '<div class="rep-acoes"><button class="bt-icone" id="r-add" aria-label="Adicionar músicas">' + icone('lista') + '</button>' +
            '<button class="bt-icone" id="r-busca" aria-label="Pesquisar neste repertório">' + icone('busca') + '</button>' +
            '<button class="bt-icone" id="r-menu" aria-label="Opções do repertório">' + icone('pontos') + '</button>' +
            '<span class="espaco"></span><button class="bt-play" id="r-play" aria-label="Modo show">' + icone('play') + '</button></div></div>' +
            '<div class="chips" style="margin:10px 0 6px">' +
            '<button class="chip" id="r-add2">' + icone('mais', ' style="width:15px;height:15px;vertical-align:-3px"') + ' Adicionar</button>' +
            '<button class="chip" id="r-bloco">' + icone('bloco', ' style="width:15px;height:15px;vertical-align:-3px"') + ' Dividir em bloco</button>' +
            '</div>' +
            '<label class="campo-busca" id="r-campo" hidden>' + icone('busca') + '<input id="r-termo" type="search" placeholder="Pesquisar neste repertório (nome, artista ou nº)" autocomplete="off"></label>' +
            '<div class="ordens"><span class="ord-rot">Ordem</span><div class="chips">' +
            r.ordens.map(o => '<button class="chip' + (o.id === r.ativa ? ' ativo' : '') + '" data-ordem="' + o.id + '">' + esc(o.nome) + '</button>').join('') +
            '<button class="chip contorno" id="r-ordem-nova">' + icone('mais', ' style="width:14px;height:14px;vertical-align:-2px"') + ' Nova</button></div>' +
            '<button class="bt-icone" id="r-ordem-menu" aria-label="Opções da ordem">' + icone('pontos') + '</button></div>' +
            '<div class="lista" id="r-lista"></div>' +
            (nMus ? '<p class="dica" style="text-align:center;margin-top:14px">Segure ' + icone('alca', ' style="width:14px;height:14px;vertical-align:-2px"') + ' e arraste para mudar a ordem</p>'
                : '<div class="vazio"><p>Repertório vazio.</p><button class="bt prim" id="r-add3">' + icone('mais') + 'Adicionar músicas</button></div>');

        const lista = document.getElementById('r-lista');
        let termoRep = ''; // pesquisa dentro do repertório
        function desenharLista() {
            let num = 0, achou = 0;
            lista.innerHTML = r.itens.map(it => {
                if (it.tipo === 'bloco' && termoRep) return '';
                if (it.tipo === 'bloco') {
                    // Quantas músicas tem este bloco (até o próximo bloco)
                    let qtd = 0;
                    for (let k = r.itens.indexOf(it) + 1; k < r.itens.length && r.itens[k].tipo !== 'bloco'; k++) qtd++;
                    return '<div class="bloco-rep item-rep" data-id="' + it.id + '"><span class="alca">' + icone('alca') + '</span><span class="bl-nome">' + esc(it.nome || 'Bloco') + '</span><span class="bl-qtd">' + qtd + ' música' + (qtd === 1 ? '' : 's') + '</span></div>';
                }
                const m = porId[it.musicaId]; num++;
                if (termoRep && !normal(num + ' ' + m.titulo + ' ' + m.artista).includes(termoRep)) return '';
                achou++;
                return '<div class="linha item-rep" data-id="' + it.id + '" data-pos="' + (num - 1) + '">' +
                    '<span class="alca" aria-label="Arrastar">' + icone('alca') + '</span><span class="num">' + num + '</span>' +
                    capaMusica(Object.assign({}, m, { semitons: it.semitons })) +
                    '<div class="l-txt"><div class="l-tit">' + esc(m.titulo) + '</div><div class="l-sub"><span class="badge' + (it.semitons ? ' verm' : '') + '">' + esc(tomAtual(m, it.semitons)) + '</span>' + ((m.cifra || '').trim() ? '' : '<span class="badge sem-cifra">sem cifra</span>') + esc(m.artista || 'Cifra') + '</div></div>' +
                    '<button class="bt-icone" data-item-menu="' + it.id + '" aria-label="Opções">' + icone('pontos') + '</button></div>';
            }).join('') || '';
            if (termoRep && !achou) lista.innerHTML = '<div class="vazio"><p>Nenhuma música deste repertório combina com a busca.</p></div>';
        }
        desenharLista();
        const campoR = document.getElementById('r-campo'), termoR = document.getElementById('r-termo');
        document.getElementById('r-busca').onclick = () => {
            campoR.hidden = !campoR.hidden;
            if (campoR.hidden) { termoR.value = ''; termoRep = ''; desenharLista(); } else termoR.focus();
        };
        termoR.oninput = () => { termoRep = normal(termoR.value.trim()); desenharLista(); };
        termoR.onkeydown = (e) => { if (e.key === 'Enter') { const p1 = lista.querySelector('.linha[data-pos]'); if (p1) abrirNoShow(parseInt(p1.dataset.pos, 10)); } };

        const abrirNoShow = (pos) => ir('#/cifra/' + r.itens.filter(i => i.tipo === 'musica')[pos].musicaId + '?rep=' + r.id + '&i=' + pos);
        const salvar = () => DB.salvarRepertorio(r);

        lista.addEventListener('click', (e) => {
            const bm = e.target.closest('[data-item-menu]');
            if (bm) { menuItem(bm.dataset.itemMenu); return; }
            if (e.target.closest('.alca')) return;
            const bl = e.target.closest('.bloco-rep');
            if (bl) { menuBloco(bl.dataset.id); return; }
            const linha = e.target.closest('.linha[data-pos]');
            if (linha) abrirNoShow(parseInt(linha.dataset.pos, 10));
        });

        /* ---- Arrastar para reordenar (dedo ou mouse, pela alça) ---- */
        lista.addEventListener('pointerdown', (e) => {
            const alca = e.target.closest('.alca'); if (!alca) return;
            if (termoRep) { toast('Limpe a busca para reordenar'); return; }
            const el = alca.closest('.item-rep');
            e.preventDefault();
            let y0 = e.clientY;
            el.classList.add('arrastando'); alca.setPointerCapture(e.pointerId);
            if (navigator.vibrate) navigator.vibrate(15);
            const mover = (ev) => {
                let dy = ev.clientY - y0;
                const ant = el.previousElementSibling, prox = el.nextElementSibling;
                if (prox && dy > prox.offsetHeight / 2) { prox.after(el); y0 += prox.offsetHeight; dy = ev.clientY - y0; }
                else if (ant && dy < -ant.offsetHeight / 2) { ant.before(el); y0 -= ant.offsetHeight; dy = ev.clientY - y0; }
                el.style.transform = 'translateY(' + dy + 'px)';
            };
            const soltar = async () => {
                alca.removeEventListener('pointermove', mover);
                el.classList.remove('arrastando'); el.style.transform = '';
                const ordem = [...lista.querySelectorAll('.item-rep')].map(x => x.dataset.id);
                r.itens.sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
                await salvar(); desenharLista();
            };
            alca.addEventListener('pointermove', mover);
            alca.addEventListener('pointerup', soltar, { once: true });
            alca.addEventListener('pointercancel', soltar, { once: true });
        });

        /* ---- Menu de um item do repertório ---- */
        function menuItem(itemId) {
            const it = r.itens.find(i => i.id === itemId); if (!it) return;
            const m = porId[it.musicaId];
            const pos = r.itens.filter(i => i.tipo === 'musica').indexOf(it);
            abrirSheet(
                '<div class="sh-cab">' + capaMusica(Object.assign({}, m, { semitons: it.semitons })) + '<div><div class="sh-tit">' + (pos + 1) + '. ' + esc(m.titulo) + '</div><div class="sh-sub">' + esc(m.artista || 'Cifra') + '</div></div></div>' +
                '<div class="ajuste"><span>Tom neste repertório</span><div class="aj-ctrl"><button class="mini-bt" data-a="tom-">−</button><span class="aj-val" id="it-tom">' + esc(tomAtual(m, it.semitons)) + '</span><button class="mini-bt" data-a="tom+">+</button></div></div>' +
                '<button class="op" data-a="abrir">' + icone('play') + 'Abrir cifra</button>' +
                '<button class="op" data-a="trocar">' + icone('trocar') + 'Substituir posição</button>' +
                '<button class="op" data-a="bloco">' + icone('bloco') + 'Começar um bloco aqui</button>' +
                '<button class="op perigo" data-a="remover">' + icone('lixeira') + 'Remover do repertório</button>',
                sh => sh.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
                    const a = b.dataset.a;
                    if (a === 'tom-' || a === 'tom+') {
                        it.semitons = (((it.semitons || 0) + (a === 'tom+' ? 1 : -1) + 18) % 12) - 6;
                        sh.querySelector('#it-tom').textContent = tomAtual(m, it.semitons);
                        await salvar(); desenharLista();
                    }
                    if (a === 'abrir') { fecharSheet(); abrirNoShow(pos); }
                    if (a === 'trocar') trocarPosicao(it);
                    if (a === 'bloco') novoBloco(pos + 1);
                    if (a === 'remover') { if (!(await confirmar('Remover do repertório?', 'A música continua na sua Discografia.', 'Remover'))) return; r.itens = r.itens.filter(i => i !== it); await salvar(); fecharSheet(); toast('Removida do repertório'); App.recarregar(); }
                })
            );
        }

        /* ---- Substituir posição: a música escolhida troca de lugar com outra (por número ou nome) ---- */
        function trocarPosicao(it) {
            const musicas = r.itens.filter(i => i.tipo === 'musica');
            const pos = musicas.indexOf(it);
            const m0 = porId[it.musicaId];
            const opcoes = (f) => musicas.map((x, k) => ({ x, k }))
                .filter(({ x, k }) => x !== it && (!f || normal((k + 1) + ' ' + porId[x.musicaId].titulo + ' ' + porId[x.musicaId].artista).includes(normal(f))))
                .map(({ x, k }) => '<button class="op" data-troca="' + x.id + '"><span class="num-op">' + (k + 1) + '</span>' + capaMusica(porId[x.musicaId], 'p40') +
                    '<span class="op-txt">' + esc(porId[x.musicaId].titulo) + '<br><small>' + esc(porId[x.musicaId].artista) + '</small></span></button>').join('')
                || '<p class="dica">Nenhuma música encontrada.</p>';
            async function trocar(outro) {
                const i = r.itens.indexOf(it), j = r.itens.indexOf(outro);
                [r.itens[i], r.itens[j]] = [r.itens[j], r.itens[i]];
                await salvar(); fecharSheet();
                toast('Nº ' + (pos + 1) + ' ⇄ nº ' + (musicas.indexOf(outro) + 1));
                App.recarregar();
            }
            abrirSheet(
                '<h3 style="margin:0 0 2px">Substituir a nº ' + (pos + 1) + '</h3>' +
                '<p class="dica" style="margin:0 0 10px">"' + esc(m0.titulo) + '" troca de lugar com a música que você escolher.</p>' +
                '<form class="dupla" id="tr-form"><input class="entrada" id="tr-num" type="number" inputmode="numeric" min="1" max="' + musicas.length + '" placeholder="Nº da música"><button class="bt prim">Trocar</button></form>' +
                '<input class="entrada" id="tr-filtro" placeholder="ou procure pelo nome..." style="margin:10px 0 4px"><div id="tr-lista">' + opcoes('') + '</div>',
                sh => {
                    const l = sh.querySelector('#tr-lista');
                    sh.querySelector('#tr-filtro').oninput = (e) => { l.innerHTML = opcoes(e.target.value); };
                    l.onclick = (e) => { const b = e.target.closest('[data-troca]'); if (b) trocar(r.itens.find(i => i.id === b.dataset.troca)); };
                    sh.querySelector('#tr-form').onsubmit = (e) => {
                        e.preventDefault();
                        const n = parseInt(sh.querySelector('#tr-num').value, 10);
                        if (!n || n < 1 || n > musicas.length) { toast('Digite um número de 1 a ' + musicas.length); return; }
                        if (n === pos + 1) { toast('Essa já é a nº ' + n); return; }
                        trocar(musicas[n - 1]);
                    };
                    setTimeout(() => sh.querySelector('#tr-num').focus(), 60);
                }
            );
        }

        /* ---- Blocos: faixas que dividem o repertório em grupos ---- */
        function novoBloco(posPadrao) {
            abrirSheet(
                '<h3 style="margin:0 0 10px">Novo bloco</h3>' +
                '<form class="form" id="bl-form"><input class="entrada" id="bl-nome" placeholder="Nome (ex.: Acústico, Bis)" maxlength="40" autocomplete="off">' +
                '<label>Começa na música nº</label><input class="entrada" id="bl-pos" type="number" inputmode="numeric" min="1" max="' + nMus + '" value="' + (posPadrao || '') + '" placeholder="vazio = no final">' +
                '<button class="bt prim cheio">Criar bloco</button></form>',
                sh => {
                    setTimeout(() => sh.querySelector('#bl-nome').focus(), 60);
                    sh.querySelector('#bl-form').onsubmit = async (e) => {
                        e.preventDefault();
                        const nome = sh.querySelector('#bl-nome').value.trim() || 'Bloco';
                        const n = parseInt(sh.querySelector('#bl-pos').value, 10);
                        const musicas = r.itens.filter(i => i.tipo === 'musica');
                        const bloco = { id: DB.novoId(), tipo: 'bloco', nome };
                        if (n >= 1 && n <= musicas.length) r.itens.splice(r.itens.indexOf(musicas[n - 1]), 0, bloco);
                        else r.itens.push(bloco);
                        await salvar(); fecharSheet(); toast('Bloco "' + nome + '" criado'); App.recarregar();
                    };
                }
            );
        }
        function menuBloco(blocoId) {
            const b = r.itens.find(i => i.id === blocoId); if (!b) return;
            abrirSheet(
                '<div class="sh-cab"><div class="capa p40" style="--c1:#7a0c14;--c2:#2a0d10">' + icone('bloco') + '</div><div><div class="sh-tit">' + esc(b.nome || 'Bloco') + '</div><div class="sh-sub">Bloco do repertório</div></div></div>' +
                '<button class="op" data-a="renomear">' + icone('lapis') + 'Renomear bloco</button>' +
                '<button class="op perigo" data-a="remover">' + icone('lixeira') + 'Remover bloco (as músicas ficam)</button>',
                sh => sh.querySelectorAll('[data-a]').forEach(btn => btn.onclick = async () => {
                    if (btn.dataset.a === 'renomear') { const n = await perguntar('Nome do bloco', b.nome); if (n) { b.nome = n; await salvar(); App.recarregar(); } }
                    if (btn.dataset.a === 'remover') { if (!(await confirmar('Remover este bloco?', 'As músicas do bloco continuam no repertório.', 'Remover'))) return; r.itens = r.itens.filter(i => i !== b); await salvar(); fecharSheet(); toast('Bloco removido'); App.recarregar(); }
                })
            );
        }

        /* ---- Várias ordens do mesmo repertório (Ordem 1, Ordem 2, A–Z...) ---- */
        const copiarItens = (itens) => itens.map(i => Object.assign({}, i, { id: DB.novoId() }));
        const nomeLivre = () => { let n = r.ordens.length + 1; while (r.ordens.some(o => o.nome === 'Ordem ' + n)) n++; return 'Ordem ' + n; };
        const ordemAtual = () => r.ordens.find(o => o.id === r.ativa);
        async function trocarOrdem(id) {
            if (id === r.ativa) return;
            const nova = r.ordens.find(o => o.id === id); if (!nova) return;
            ordemAtual().itens = r.itens; // guarda a lista atual antes de trocar
            r.ativa = id; r.itens = nova.itens;
            await salvar(); toast('Usando "' + nova.nome + '"'); App.recarregar();
        }
        async function criarOrdem(nome, itens) {
            ordemAtual().itens = r.itens;
            const o = { id: DB.novoId(), nome, itens };
            r.ordens.push(o); r.ativa = o.id; r.itens = o.itens;
            await salvar(); toast('Ordem "' + nome + '" criada'); App.recarregar();
        }
        function novaOrdem() {
            abrirSheet(
                '<h3 style="margin:0 0 10px">Nova ordem</h3>' +
                '<form class="form" id="no-form"><input class="entrada" id="no-nome" value="' + esc(nomeLivre()) + '" maxlength="40" autocomplete="off">' +
                '<div class="dupla"><button class="bt" type="button" id="no-vazia">Começar vazia</button><button class="bt prim">Copiar a atual</button></div></form>' +
                '<p class="dica">Cada ordem guarda a própria sequência, blocos e tons. As cifras são as mesmas.</p>',
                sh => {
                    const nome = () => sh.querySelector('#no-nome').value.trim() || nomeLivre();
                    sh.querySelector('#no-form').onsubmit = (e) => { e.preventDefault(); criarOrdem(nome(), copiarItens(r.itens)); };
                    sh.querySelector('#no-vazia').onclick = () => criarOrdem(nome(), []);
                }
            );
        }
        const ORGANIZAR = [
            ['az', 'Título (A–Z)'], ['artista', 'Artista (A–Z)'], ['tom', 'Tom (C, C#, D…)'], ['bpm', 'BPM (mais lenta → mais rápida)'],
            ['lista', 'Nº da lista original'], ['aleatoria', 'Aleatória'], ['inverter', 'Inverter a ordem atual'],
        ];
        function chaveTom(it) {
            const a = CifraMotor.analisarAcorde(tomAtual(porId[it.musicaId], it.semitons));
            return a ? a.raiz * 2 + (CifraMotor.qualidade(a.sufixo) === 'm' ? 1 : 0) : 99;
        }
        /* Organiza as músicas dentro de cada bloco (os blocos ficam onde estão). */
        function organizado(tipo) {
            const ordenar = (lista) => {
                const L = lista.map(it => ({ it, m: porId[it.musicaId] }));
                const porTitulo = (a, b) => a.m.titulo.localeCompare(b.m.titulo, 'pt-BR');
                if (tipo === 'az') L.sort(porTitulo);
                if (tipo === 'artista') L.sort((a, b) => (a.m.artista || '').localeCompare(b.m.artista || '', 'pt-BR') || porTitulo(a, b));
                if (tipo === 'tom') L.sort((a, b) => chaveTom(a.it) - chaveTom(b.it) || porTitulo(a, b));
                if (tipo === 'bpm') L.sort((a, b) => (a.m.bpm || 999) - (b.m.bpm || 999) || porTitulo(a, b));
                if (tipo === 'lista') L.sort((a, b) => (a.m.numeroLista || 9999) - (b.m.numeroLista || 9999) || porTitulo(a, b));
                if (tipo === 'aleatoria') for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; }
                if (tipo === 'inverter') L.reverse();
                return L.map(x => x.it);
            };
            const res = []; let trecho = [];
            for (const it of r.itens) {
                if (it.tipo === 'bloco') { res.push(...ordenar(trecho), it); trecho = []; } else trecho.push(it);
            }
            res.push(...ordenar(trecho));
            return res;
        }
        function organizar() {
            let comoNova = true;
            abrirSheet(
                '<h3 style="margin:0 0 4px">Organizar automaticamente</h3><p class="dica" style="margin:0 0 6px">Organiza dentro de cada bloco.</p>' +
                '<div class="ajuste"><span>Criar como nova ordem</span><button class="chave on" id="og-nova" aria-label="Criar como nova ordem"></button></div>' +
                ORGANIZAR.map(([k, t]) => '<button class="op" data-og="' + k + '">' + icone('lista') + t + '</button>').join(''),
                sh => {
                    const ch = sh.querySelector('#og-nova');
                    ch.onclick = () => { comoNova = !comoNova; ch.classList.toggle('on', comoNova); };
                    sh.querySelectorAll('[data-og]').forEach(b => b.onclick = async () => {
                        const tipo = b.dataset.og, itens = organizado(tipo), rotulo = ORGANIZAR.find(x => x[0] === tipo)[1];
                        if (comoNova) { criarOrdem(rotulo, copiarItens(itens)); return; }
                        r.itens = itens; await salvar(); toast('Organizado: ' + rotulo); App.recarregar();
                    });
                }
            );
        }
        function menuOrdem() {
            const o = ordemAtual();
            abrirSheet(
                '<div class="sh-cab">' + capaRep(r) + '<div><div class="sh-tit">' + esc(o.nome) + '</div><div class="sh-sub">Ordem em uso · ' + r.ordens.length + ' no total</div></div></div>' +
                '<button class="op" data-a="organizar">' + icone('lista') + 'Organizar automaticamente…</button>' +
                '<button class="op" data-a="duplicar">' + icone('repertorio') + 'Duplicar esta ordem</button>' +
                '<button class="op" data-a="renomear">' + icone('lapis') + 'Renomear ordem</button>' +
                (r.ordens.length > 1 ? '<button class="op perigo" data-a="excluir">' + icone('lixeira') + 'Excluir esta ordem</button>' : ''),
                sh => sh.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
                    const a = b.dataset.a;
                    if (a === 'organizar') organizar();
                    if (a === 'duplicar') criarOrdem(o.nome + ' (cópia)', copiarItens(r.itens));
                    if (a === 'renomear') { const n = await perguntar('Nome da ordem', o.nome); if (n) { o.nome = n; await salvar(); App.recarregar(); } }
                    if (a === 'excluir' && await confirmar('Excluir "' + o.nome + '"?', 'Só esta ordem é apagada. As músicas e as outras ordens continuam.', 'Excluir')) {
                        r.ordens = r.ordens.filter(x => x !== o); r.ativa = r.ordens[0].id; r.itens = r.ordens[0].itens;
                        await salvar(); toast('Ordem excluída'); App.recarregar();
                    }
                })
            );
        }

        /* ---- Adicionar várias músicas ---- */
        function adicionarMusicas() {
            const ordenadas = ms.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
            const desenharOpcoes = (filtro) => ordenadas.filter(m => !filtro || normal(m.titulo + ' ' + m.artista).includes(normal(filtro))).map(m => {
                const tem = r.itens.some(i => i.musicaId === m.id);
                return '<button class="op" data-m="' + m.id + '">' + capaMusica(m, 'p40') +
                    '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.titulo) + '<br><small style="color:var(--texto-2)">' + esc(m.artista) + '</small></span>' +
                    '<span class="op-dir">' + icone(tem ? 'check' : 'mais', tem ? ' style="color:var(--verm-claro)"' : '') + '</span></button>';
            }).join('') || '<p class="dica">Nenhuma cifra encontrada.</p>';
            abrirSheet(
                '<h3 style="margin:0 0 10px">Adicionar a "' + esc(r.nome) + '"</h3>' +
                '<input class="entrada" id="am-filtro" placeholder="Filtrar..." style="margin-bottom:6px"><div id="am-lista">' + desenharOpcoes('') + '</div>' +
                '<button class="bt prim cheio" id="am-ok" style="margin-top:10px">Pronto</button>',
                sh => {
                    const l = sh.querySelector('#am-lista');
                    sh.querySelector('#am-filtro').oninput = (e) => { l.innerHTML = desenharOpcoes(e.target.value); };
                    l.onclick = async (e) => {
                        const b = e.target.closest('[data-m]'); if (!b) return;
                        const id = b.dataset.m;
                        const ja = r.itens.find(i => i.musicaId === id);
                        if (ja) r.itens = r.itens.filter(i => i !== ja);
                        else r.itens.push({ id: DB.novoId(), tipo: 'musica', musicaId: id, semitons: 0 });
                        await salvar();
                        b.querySelector('.op-dir').innerHTML = icone(ja ? 'mais' : 'check', ja ? '' : ' style="color:var(--verm-claro)"');
                    };
                    sh.querySelector('#am-ok').onclick = () => fecharSheet();
                },
                () => App.recarregar()
            );
        }

        /* ---- Menu do repertório ---- */
        document.getElementById('r-menu').onclick = () => abrirSheet(
            '<div class="sh-cab">' + capaRep(r) + '<div><div class="sh-tit">' + esc(r.nome) + '</div><div class="sh-sub">' + nMus + ' músicas</div></div></div>' +
            '<button class="op" data-a="renomear">' + icone('lapis') + 'Renomear</button>' +
            '<button class="op" data-a="descricao">' + icone('nota') + 'Descrição</button>' +
            // js/compartilhar.js: itens 9 e 10
            '<button class="op" data-a="banda">' + icone('trocar') + 'Mandar para a banda<span class="op-dir">arquivo ou QR</span></button>' +
            '<button class="op" data-a="cardapio">' + icone('lista') + 'Cardápio de pedidos (QR)<span class="op-dir">para o público</span></button>' +
            // js/show-ajuda.js e js/banda.js
            '<button class="op" data-a="ordem-inteligente">' + icone('trocar') + 'Ordem inteligente<span class="op-dir">menos trocas · energia</span></button>' +
            '<button class="op" data-a="banda-sync">' + icone('palco') + 'Banda sincronizada<span class="op-dir">' + (window.Banda && Banda.papel() === 'lider' ? Banda.conectados() + ' conectado(s)' : 'celulares acompanham') + '</span></button>' +
            '<button class="op perigo" data-a="excluir">' + icone('lixeira') + 'Excluir repertório</button>',
            sh => sh.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
                const a = b.dataset.a;
                if (a === 'renomear') { const n = await perguntar('Renomear repertório', r.nome); if (n) { r.nome = n; await salvar(); App.recarregar(); } }
                if (a === 'descricao') { const d = await perguntar('Descrição (ex.: Show no bar, sábado)', r.descricao); if (d !== null) { r.descricao = d; await salvar(); App.recarregar(); } }
                if (a === 'banda') { fecharSheet(); setTimeout(() => Compartilhar.abrirBanda(r), 60); }
                if (a === 'cardapio') { fecharSheet(); setTimeout(() => Compartilhar.abrirCardapio(r), 60); }
                if (a === 'ordem-inteligente') { fecharSheet(); setTimeout(() => ShowAjuda.abrirOrdem(r), 60); }
                if (a === 'banda-sync') { fecharSheet(); setTimeout(() => Banda.abrirLider(), 60); }
                if (a === 'excluir') {
                    if (await confirmar('Excluir "' + r.nome + '"?', 'As cifras continuam salvas, só o repertório é apagado.', 'Excluir')) {
                        const copiaR = JSON.parse(JSON.stringify(r));
                        await DB.excluirRepertorio(r.id); ir('#/biblioteca');
                        UI.toastAcao('Repertório excluído', 'Desfazer', () => desfazerRepertorio(copiaR));
                    }
                }
            })
        );
        document.getElementById('r-bloco').onclick = () => novoBloco();
        const sp=document.createElement('button');sp.className='chip';sp.id='r-show-programado';sp.textContent='Show programado / intervalos';document.getElementById('r-bloco').after(sp);sp.onclick=()=>ShowProgramado.configurarRepertorio(r);
        tela().querySelectorAll('[data-ordem]').forEach(b => b.onclick = () => trocarOrdem(b.dataset.ordem));
        document.getElementById('r-ordem-nova').onclick = novaOrdem;
        document.getElementById('r-ordem-menu').onclick = menuOrdem;
        ['r-add', 'r-add2', 'r-add3'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = adicionarMusicas; });
        document.getElementById('r-play').onclick = () => { if (nMus) abrirNoShow(0); else adicionarMusicas(); };
    }

    /* =================================================================
       CONFIGURAÇÕES — pedal / MIDI e rolagem pelo pedal
       ================================================================= */
    async function config() {
        const C = Controle;
        const chaveAj = (rotulo, id, on, dica) => '<div class="ajuste"><span>' + rotulo + (dica ? '<br><small class="dica">' + dica + '</small>' : '') + '</span><button class="chave ' + (on ? 'on' : '') + '" id="' + id + '" aria-label="' + esc(rotulo) + '"></button></div>';
        const statusMidi = () => {
            const e = C.estado;
            if (!e.suportado) return 'Não disponível neste navegador (use o Chrome ou o Edge).';
            if (e.erro) return e.erro;
            if (!e.ligado) return 'Desligado';
            return e.entradas.length ? 'Conectado: ' + e.entradas.join(', ') : 'Ligado, mas nenhum controlador encontrado. Conecte o pedal.';
        };
        const textoRolagem = (pct) => {
            const linha = 15 * prefs().fonte / 100 * 1.38;
            const n = Math.max(1, Math.round(Math.max(200, window.innerHeight - 150) * pct / 100 / linha));
            return pct + '% da tela · ≈ ' + n + ' linhas da cifra';
        };

        function desenhar() {
            const c = C.cfg(), e = C.estado;
            tela().innerHTML =
                '<div class="topo"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button><h1 class="titulo" style="margin:0;flex:1;font-size:22px">Configurações</h1></div>' +
                abertura(3, 'Seu jeito de tocar', 'Ajuste os bastidores.', 'Configure o pedal, os atalhos e a rolagem para acompanhar o seu ritmo.') +
                '<h2 class="secao">Pedal e MIDI</h2><div class="cartao-cfg">' +
                '<div class="ajuste"><span><b>MIDI</b><br><small class="dica" id="cf-status">' + esc(statusMidi()) + '</small></span><button class="chave ' + (e.ligado ? 'on' : '') + '" id="cf-midi" aria-label="MIDI"></button></div>' +
                (e.ligado ? '<div class="dica" style="padding:0 4px 8px">Última mensagem recebida: <b id="cf-ultima">' + esc(e.ultima || '—') + '</b></div>' : '') +
                chaveAj('Program Change vai para a música nº', 'cf-pc', c.pcMusica, 'PC 0 = música 1, PC 1 = música 2… (quando o PC não tem botão definido)') +
                chaveAj('Pedal em modo alternado', 'cf-alt', c.ccAlternado, 'Liga se o pedal manda CC 127 numa pisada e CC 0 na outra') +
                '</div>' +
                '<h2 class="secao">Rolagem pelo pedal</h2><div class="cartao-cfg">' +
                '<div class="dica" style="padding-top:6px">Quanto a tela desce (ou sobe) a cada pisada.</div>' +
                '<input type="range" class="potenciometro" id="cf-rol" min="10" max="100" step="5" value="' + c.rolagemPct + '" aria-label="Quanto rolar por pisada">' +
                '<div class="pot-val" id="cf-rol-txt">' + textoRolagem(c.rolagemPct) + '</div>' +
                chaveAj('Segurar o botão trava a rolagem', 'cf-seg', c.segurarTrava, 'Segure o botão de descer, subir, iniciar ou parar por cerca de 0,7 s para travar (e de novo para soltar). Vale para teclas, Nota e CC; não vale para Program Change. Também há o botão "Travar / destravar a rolagem" na lista abaixo.') +
                '</div>' +
                '<h2 class="secao">Botões <button class="chip contorno" id="cf-restaurar">Restaurar padrão</button></h2>' +
                '<div class="lista">' + C.ACOES.map(a => '<div class="acao-cfg"><div class="ac-nome">' + esc(a.nome) + '</div><div class="ac-sigs">' +
                    C.assinaturasDe(a.id).map(sg => '<span class="sig">' + esc(C.descrever(sg)) + '<button data-tirar="' + esc(sg) + '" aria-label="Remover">×</button></span>').join('') +
                    '<button class="chip" data-aprender="' + a.id + '">+ Aprender</button></div></div>').join('') + '</div>' +
                '<p class="dica" style="margin-top:14px">Chocolate Plus: no app CubeSuite escolha um modo MIDI (PC, CC ou Nota) ou um modo de teclado (Page Up/Down, setas). Depois toque em "+ Aprender" e pise no botão. No modo teclado o MIDI pode ficar desligado.</p>';

            const $ = (id) => document.getElementById(id);
            $('cf-midi').onclick = async () => {
                if (C.estado.ligado) C.desligarMidi();
                else { const ok = await C.iniciarMidi(); toast(ok ? 'MIDI ligado' : 'Não foi possível ligar o MIDI'); }
                desenhar();
            };
            $('cf-pc').onclick = () => { C.salvarCfg({ pcMusica: !C.cfg().pcMusica }); desenhar(); };
            $('cf-seg').onclick = () => { C.salvarCfg({ segurarTrava: !C.cfg().segurarTrava }); desenhar(); };
            $('cf-alt').onclick = () => { C.salvarCfg({ ccAlternado: !C.cfg().ccAlternado }); desenhar(); };
            $('cf-rol').oninput = (ev) => { const v = parseInt(ev.target.value, 10); C.salvarCfg({ rolagemPct: v }); $('cf-rol-txt').textContent = textoRolagem(v); };
            $('cf-restaurar').onclick = async () => {
                if (await confirmar('Restaurar os botões?', 'Apaga os botões aprendidos e volta as teclas padrão.', 'Restaurar')) { C.restaurarPadrao(); desenhar(); }
            };
            tela().querySelectorAll('[data-tirar]').forEach(b => b.onclick = async () => { if (!(await confirmar('Tirar este botão do pedal?', 'Você pode ligar de novo depois.', 'Tirar'))) return; C.desligar(b.dataset.tirar); desenhar(); });
            tela().querySelectorAll('[data-aprender]').forEach(b => b.onclick = () => aprenderBotao(b.dataset.aprender));
        }

        async function aprenderBotao(acao) {
            abrirSheet(
                '<div class="aprender"><div class="pulso"></div><h3 style="margin:0 0 4px">Pise o pedal agora</h3>' +
                '<p style="margin:0 0 6px">' + esc(C.nomeAcao(acao)) + '</p>' +
                '<p class="dica" style="margin:0 0 14px">' + (C.estado.ligado ? 'Pise o botão do pedal ou aperte uma tecla.' : 'O MIDI está desligado: só teclas (pedal em modo teclado) serão aprendidas.') + '</p>' +
                '<button class="bt" id="ap-cancelar">Cancelar</button></div>',
                sh => { sh.querySelector('#ap-cancelar').onclick = () => fecharSheet(); },
                () => C.cancelarAprender()
            );
            const sig = await C.aprender(15000);
            fecharSheet();
            if (!sig) return;
            const antes = C.ligar(acao, sig);
            toast(C.descrever(sig) + (antes ? ' saiu de "' + C.nomeAcao(antes) + '"' : ' → ' + C.nomeAcao(acao)));
            desenhar();
        }

        // Atualiza o status e a "última mensagem" ao vivo (útil para conferir o pedal).
        C.aoMudar = () => {
            const st = document.getElementById('cf-status'), ul = document.getElementById('cf-ultima');
            if (st) st.textContent = statusMidi();
            if (ul) ul.textContent = C.estado.ultima || '—';
        };
        desenhar();
        return () => { C.aoMudar = null; C.cancelarAprender(); };
    }

    /* Bloco de uma frase com o ACORDE em cima da sua sílaba (quebra por palavra). Usado pelo karaokê. */
    function fraseComAcordes(container, n) {
        const els = [...container.querySelectorAll('[data-frase="' + n + '"]')];
        const pronto = els.find(el => el.classList.contains('l-reflow'));
        if (pronto) { const c = pronto.cloneNode(true); c.classList.remove('frase-ativa', 'frase-preparada'); c.removeAttribute('data-frase'); return c; }
        const ac = els.find(el => el.classList.contains('l-acordes'));
        const letra = els.find(el => el.classList.contains('l-letra'));
        if (ac) { const b = blocoReflow(palavrasDaFrase(ac, letra || null), n); b.removeAttribute('data-frase'); return b; }
        const d = document.createElement('div'); d.className = 'l l-letra'; d.textContent = letra ? letra.textContent.trim() : ''; return d;
    }

    global.Telas = { fraseComAcordes, inicio, show, curtidas, buscar, biblioteca, criar, cifra, repertorio, config, menuMusica, menuConta, menuCriar };
})(window);
