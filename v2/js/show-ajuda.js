/*
 * show-ajuda.js — Ajudas de palco: emendar músicas, avisos entre músicas,
 * ordem inteligente do repertório e modo baterista.
 * ---------------------------------------------------------------------------
 * PARTES
 *   1. ACORDES ........... primeiroAcorde, ultimoAcorde, campo harmônico
 *   2. EMENDAR ........... sugerirEmenda(A, B)  -> caminhos de acordes entre duas músicas
 *   3. AVISOS ............ diferencas(atual, proxima), desenharProxima(), faixa perto do fim
 *   4. ORDEM INTELIGENTE . abrirOrdem(r)        -> nova "ordem" no repertório (a sua continua salva)
 *   5. MODO BATERISTA .... aplicarBaterista(conteudo, m, ligado)
 *
 * Usado por telas.js (tela da cifra e menu do repertório). Sem dados novos obrigatórios:
 * usa tom, capo, BPM e afinação que a música já tem; "lembrete" é opcional (m.lembrete).
 */
(function (global) {
    'use strict';
    const { icone, esc, toast, abrirSheet, fecharSheet, perguntar, prefs } = UI;
    const C = () => global.CifraMotor;

    /* =====================================================================
       1. ACORDES
       ===================================================================== */

    /** Acordes de uma linha de acordes, na ordem. */
    function acordesDaLinha(linha) {
        return linha.split(/[\s|]+/).map(p => p.replace(/^\(|\)$/g, '')).filter(p => p && C().ehAcorde(p));
    }
    /** Primeiro (ou último) acorde tocado na cifra (texto do app). Devolve '' se não houver. */
    function acordeNaPonta(cifra, ultimo) {
        const linhas = String(cifra || '').split('\n');
        if (ultimo) linhas.reverse();
        for (const l of linhas) {
            if (C().tipoLinha(l).tipo !== 'acordes') continue;
            const a = acordesDaLinha(l);
            if (a.length) return ultimo ? a[a.length - 1] : a[0];
        }
        return '';
    }
    const ehMenor = (tom) => /^[A-G][#b]?m(?!aj)/.test(tom || '');
    /** Tom em que a música SOA (tom original + transposição). */
    function tomSoando(m, semitons) {
        const base = m.tom || (m.cifra ? C().detectarTom(m.cifra) : '') || '';
        return base ? C().transporTom(base, semitons || 0) : '';
    }

    // Campo harmônico: [grau em semitons, qualidade, nome do grau]
    const MAIOR = [[0, '', 'I'], [2, 'm', 'ii'], [4, 'm', 'iii'], [5, '', 'IV'], [7, '', 'V'], [9, 'm', 'vi']];
    const MENOR = [[0, 'm', 'i'], [3, '', 'III'], [5, 'm', 'iv'], [7, 'm', 'v'], [8, '', 'VI'], [10, '', 'VII']];
    function campo(tom) {
        const a = C().analisarAcorde(tom); if (!a) return [];
        return (ehMenor(tom) ? MENOR : MAIOR).map(([g, q, grau]) => ({ pc: (a.raiz + g) % 12, q, grau }));
    }

    /* =====================================================================
       2. EMENDAR (medley)
       ===================================================================== */

    /**
     * Sugere como passar da música A para a B sem parar.
     * Recebe { m, semitons } de cada uma. Devolve:
     *   { mesmoTom, de, para, tomA, tomB, intervalo, caminhos: [{ nome, acordes[], dica }] }
     * Os acordes saem SOANDO (sem capo). desenharProxima mostra as formas com o capo atual.
     */
    function sugerirEmenda(A, B) {
        const tomA = tomSoando(A.m, A.semitons), tomB = tomSoando(B.m, B.semitons);
        const de = C().transporAcorde(acordeNaPonta(A.m.cifra, true) || tomA, A.semitons || 0);
        const para = C().transporAcorde(acordeNaPonta(B.m.cifra, false) || tomB, B.semitons || 0);
        const res = { mesmoTom: false, de, para, tomA, tomB, intervalo: 0, caminhos: [] };
        const a = C().analisarAcorde(tomA), b = C().analisarAcorde(tomB);
        if (!a || !b) return res;
        const bem = C().tomUsaBemol(tomB);
        const nota = (pc) => C().nomeNota(pc, bem);
        const raizB = b.raiz;
        res.intervalo = ((raizB - a.raiz) + 12) % 12;
        res.mesmoTom = res.intervalo === 0 && ehMenor(tomA) === ehMenor(tomB);
        const V7 = nota(raizB + 7) + '7';
        const ii = nota(raizB + 2) + (ehMenor(tomB) ? 'm7(b5)' : 'm7');
        const sem = (lista) => lista.filter((x, i) => x && x !== lista[i - 1]);   // tira repetidos seguidos

        if (res.mesmoTom) {
            res.caminhos.push({ nome: 'Mesmo tom', acordes: sem([de, para]), dica: 'Emende direto: termine em ' + de + ' e entre na próxima.' });
            if (de !== tomB && de !== V7) res.caminhos.push({ nome: 'Com a dominante', acordes: sem([de, V7, para]), dica: 'Um compasso de ' + V7 + ' prepara a entrada.' });
            return res;
        }
        res.caminhos.push({ nome: 'Pela dominante', acordes: sem([de, V7, para]), dica: 'O jeito mais seguro: 1 compasso de ' + V7 + ' antes de entrar.' });
        res.caminhos.push({ nome: 'ii – V', acordes: sem([de, ii, V7, para]), dica: 'Mais suave: ' + ii + ' e ' + V7 + ', meio compasso cada (ou um compasso cada).' });
        // Acorde em comum (pivô): está nos dois campos harmônicos; de preferência um ii, IV ou vi no tom novo.
        const ca = campo(tomA), cb = campo(tomB);
        const preferidos = ehMenor(tomB) ? ['iv', 'VI', 'III'] : ['ii', 'IV', 'vi'];
        const comuns = cb.filter(x => x.pc !== raizB && ca.some(y => y.pc === x.pc && y.q === x.q));
        comuns.sort((x, y) => (preferidos.indexOf(x.grau) + 9) % 9 - (preferidos.indexOf(y.grau) + 9) % 9);
        if (comuns.length) {
            const piv = nota(comuns[0].pc) + comuns[0].q;
            res.caminhos.push({ nome: 'Acorde em comum', acordes: sem([de, piv, V7, para]), dica: piv + ' existe nos dois tons: a mudança quase não se percebe.' });
        }
        if (res.intervalo === 1 || res.intervalo === 2) {
            res.caminhos[0].dica += ' Subida de ' + (res.intervalo === 1 ? 'meio tom' : 'um tom') + ': dá aquele efeito de "subir o refrão".';
        }
        return res;
    }

    /* =====================================================================
       3. AVISOS ENTRE MÚSICAS
       ===================================================================== */

    /** O que muda da música atual para a próxima: [{ tipo, texto, forte }]. */
    function diferencas(atual, prox) {
        const out = [];
        const capoA = atual.capo || 0, capoB = prox.m.capo || 0;
        if (capoA !== capoB) out.push({ tipo: 'capo', forte: true, texto: capoB ? 'Capo na ' + capoB + 'ª casa' + (capoA ? ' (agora está na ' + capoA + 'ª)' : '') : 'Tire o capo' });
        const afA = atual.m.afinacao || 'Padrão', afB = prox.m.afinacao || 'Padrão';
        if (afA !== afB) out.push({ tipo: 'afinacao', forte: true, texto: 'Afinação: ' + afB + (afB === 'Padrão' ? ' (volte ao padrão)' : '') });
        if (prox.m.lembrete) out.push({ tipo: 'lembrete', forte: true, texto: prox.m.lembrete });
        const bA = atual.m.bpm || 0, bB = prox.m.bpm || 0;
        if (bA && bB && Math.abs(bA - bB) >= 25) out.push({ tipo: 'bpm', texto: (bB > bA ? 'Mais rápida: ' : 'Mais lenta: ') + bA + ' → ' + bB + ' BPM' });
        if (!(prox.m.cifra || '').trim()) out.push({ tipo: 'cifra', texto: 'A próxima ainda não tem cifra' });
        return out;
    }

    /**
     * Cartão "Próxima música" no fim da cifra (emendar + o que preparar) e a faixa
     * que aparece perto do fim da música. Devolve uma função de limpeza.
     * op: { el, m, semitons, capo, prox: { m, semitons }, irProxima() }
     */
    function desenharProxima(op) {
        const el = op.el;
        if (!op.prox) { el.innerHTML = ''; return () => {}; }
        const atual = { m: op.m, capo: op.capo };
        const difs = diferencas(atual, op.prox);
        const em = sugerirEmenda({ m: op.m, semitons: op.semitons }, op.prox);
        // Formas no violão com o capo ATUAL (a passagem é tocada antes de trocar o capo).
        const forma = (ac) => op.capo ? C().transporAcorde(ac, -op.capo) : ac;
        const chip = (ac) => '<b class="ac" data-ac="' + esc(forma(ac)) + '">' + esc(forma(ac)) + '</b>';
        el.innerHTML =
            '<div class="prox-card">' +
            '<div class="prox-cab"><small>PRÓXIMA</small><b>' + esc(op.prox.m.titulo) + '</b><span>' + esc(op.prox.m.artista || '') + (em.tomB ? ' · tom ' + esc(em.tomB) : '') + (op.prox.m.bpm ? ' · ' + op.prox.m.bpm + ' BPM' : '') + '</span></div>' +
            (difs.length ? '<ul class="prox-avisos">' + difs.map(d => '<li class="' + (d.forte ? 'forte' : '') + '">' + esc(d.texto) + '</li>').join('') + '</ul>' : '<p class="dica" style="margin:6px 0">Nada para trocar no instrumento.</p>') +
            (em.caminhos.length ? '<div class="prox-emenda"><small>EMENDAR' + (op.capo ? ' (formas com o capo na ' + op.capo + 'ª)' : '') + '</small>' +
                em.caminhos.map(c => '<div class="emenda"><span class="em-nome">' + esc(c.nome) + '</span><span class="em-acordes">' + c.acordes.map(chip).join(' <i>→</i> ') + '</span><small>' + esc(c.dica) + '</small></div>').join('') + '</div>' : '') +
            '<div class="dupla" style="margin-top:8px"><button class="bt" data-prox="lembrete">' + icone('lapis') + 'Lembrete</button><button class="bt prim" data-prox="ir">' + icone('proxima') + 'Ir para a próxima</button></div></div>';
        el.querySelector('[data-prox="ir"]').onclick = op.irProxima;
        el.querySelector('[data-prox="lembrete"]').onclick = async () => {
            const t = await perguntar('Lembrete antes de "' + op.prox.m.titulo + '" (ex.: violão de 12, pedal de distorção)', op.prox.m.lembrete || '', 'Salvar');
            if (t === null) return;
            op.prox.m.lembrete = t.trim();
            await DB.atualizarMusica(op.prox.m.id, { lembrete: op.prox.m.lembrete });
            desenharProxima(op);
        };

        // ---- Faixa perto do fim: aparece uma vez por música quando falta pouco ----
        // AJUSTAR: quanto falta (em alturas de tela) para a faixa aparecer.
        const FALTANDO_TELAS = 1.3;
        let faixa = document.getElementById('prox-faixa');
        if (faixa) faixa.remove();
        faixa = document.createElement('div');
        faixa.id = 'prox-faixa'; faixa.hidden = true; faixa.setAttribute('role', 'status');
        const fortes = difs.filter(d => d.forte).map(d => d.texto);
        faixa.innerHTML = '<span><small>Próxima:</small> <b>' + esc(op.prox.m.titulo) + '</b>' + (fortes.length ? ' · <em>' + esc(fortes.join(' · ')) + '</em>' : '') + '</span><button class="bt-icone" aria-label="Fechar aviso">' + icone('fechar') + '</button>';
        document.body.appendChild(faixa);
        let fechada = false;
        faixa.querySelector('button').onclick = () => { fechada = true; faixa.hidden = true; };
        const conferir = () => {
            if (fechada) return;
            const alvo = el.getBoundingClientRect().top;               // o cartão fica logo depois do fim da cifra
            // só depois que a música começou a rolar (scrollY), senão músicas curtas mostrariam a faixa de cara
            faixa.hidden = !(window.scrollY > 40 && alvo < window.innerHeight * (1 + FALTANDO_TELAS) && alvo > window.innerHeight * 0.6);
        };
        window.addEventListener('scroll', conferir, { passive: true });
        conferir();
        return () => { window.removeEventListener('scroll', conferir); faixa.remove(); };
    }

    /* =====================================================================
       4. ORDEM INTELIGENTE
       ===================================================================== */

    /** Custo de tocar b logo depois de a: trocas no instrumento pesam mais; saltos grandes de BPM pesam pouco. */
    function custo(a, b) {
        let c = 0;
        if ((a.afinacao || 'Padrão') !== (b.afinacao || 'Padrão')) c += 5;   // AJUSTAR: peso de reafinar
        if ((a.capo || 0) !== (b.capo || 0)) c += 2;                          // AJUSTAR: peso de mudar o capo
        if (a.bpm && b.bpm && Math.abs(a.bpm - b.bpm) > 40) c += 0.5;
        return c;
    }
    const trocasDe = (lista) => lista.reduce((n, x, i) => i ? n + ((lista[i - 1].afinacao || 'Padrão') !== (x.afinacao || 'Padrão') ? 1 : 0) + ((lista[i - 1].capo || 0) !== (x.capo || 0) ? 1 : 0) : 0, 0);

    /** Menos trocas: mantém a 1ª e a última música (abertura e encerramento) e reorganiza o meio. */
    function ordenarTrocas(ms) {
        if (ms.length <= 3) return ms.slice();
        const primeira = ms[0], ultima = ms[ms.length - 1];
        let resto = ms.slice(1, -1);
        const rota = [primeira];
        while (resto.length) {                                     // vizinho mais próximo
            const atual = rota[rota.length - 1];
            let melhor = 0;
            resto.forEach((x, i) => { if (custo(atual, x) < custo(atual, resto[melhor])) melhor = i; });
            rota.push(resto.splice(melhor, 1)[0]);
        }
        rota.push(ultima);
        const total = (r) => r.reduce((s, x, i) => i ? s + custo(r[i - 1], x) : 0, 0);
        let melhorou = true;                                       // 2-opt: inverte trechos se diminuir o custo
        while (melhorou) {
            melhorou = false;
            for (let i = 1; i < rota.length - 2; i++) for (let k = i + 1; k < rota.length - 1; k++) {
                const nova = rota.slice(0, i).concat(rota.slice(i, k + 1).reverse(), rota.slice(k + 1));
                if (total(nova) < total(rota) - 1e-9) { rota.splice(0, rota.length, ...nova); melhorou = true; }
            }
        }
        return rota;
    }

    /** Energia: abre forte, alterna agitadas e calmas (sem duas lentas seguidas) e fecha com a mais rápida. */
    function ordenarEnergia(ms) {
        const com = ms.filter(x => x.bpm).sort((a, b) => b.bpm - a.bpm), sem = ms.filter(x => !x.bpm);
        if (com.length < 3) return ms.slice();
        const fim = com.shift(), abre = com.shift();
        const meio = [];
        let alto = true;
        while (com.length) { meio.push(alto ? com.shift() : com.pop()); alto = !alto; }
        const metade = Math.ceil(meio.length / 2);
        return [abre].concat(meio.slice(0, metade), sem, meio.slice(metade), [fim]);
    }

    /** Painel "Ordem inteligente". r = repertório aberto (com r.itens da ordem ativa). */
    async function abrirOrdem(r) {
        const porId = Object.fromEntries((await DB.listarMusicas()).map(m => [m.id, m]));
        // Separa por blocos: cada bloco é reorganizado por dentro; os blocos ficam no lugar.
        const grupos = [];
        let g = { bloco: null, itens: [] };
        r.itens.forEach(it => {
            if (it.tipo === 'bloco') { grupos.push(g); g = { bloco: it, itens: [] }; }
            else if (porId[it.musicaId]) g.itens.push(it);
        });
        grupos.push(g);
        const info = (it) => Object.assign({ it }, porId[it.musicaId]);
        const montar = (modo) => {
            const novo = [];
            grupos.forEach(gr => {
                if (gr.bloco) novo.push(gr.bloco);
                const ms = gr.itens.map(info);
                (modo === 'trocas' ? ordenarTrocas(ms) : ordenarEnergia(ms)).forEach(x => novo.push(x.it));
            });
            return novo;
        };
        const antes = trocasDe(r.itens.filter(i => i.tipo === 'musica').map(info));
        const linha = (it, n) => {
            const m = porId[it.musicaId];
            const tags = [m.capo ? 'capo ' + m.capo : '', m.afinacao && m.afinacao !== 'Padrão' ? m.afinacao : '', m.bpm ? m.bpm + ' BPM' : ''].filter(Boolean).join(' · ');
            return '<div class="op" style="cursor:default;min-height:0;padding:6px 8px"><span class="num-op">' + n + '</span><span class="op-txt">' + esc(m.titulo) + (tags ? '<br><small>' + esc(tags) + '</small>' : '') + '</span></div>';
        };
        function mostrar(modo) {
            const novo = montar(modo);
            const depois = trocasDe(novo.filter(i => i.tipo === 'musica').map(info));
            let n = 0;
            abrirSheet(
                '<h3 style="margin:0 0 6px">Ordem inteligente</h3>' +
                '<div class="abas" style="margin-bottom:8px"><button class="chip' + (modo === 'trocas' ? ' ativo' : '') + '" data-modo="trocas">Menos trocas</button><button class="chip' + (modo === 'energia' ? ' ativo' : '') + '" data-modo="energia">Energia do show</button></div>' +
                '<p class="dica" style="margin:0 0 8px">' + (modo === 'trocas'
                    ? 'Agrupa músicas com o mesmo capo e a mesma afinação. A 1ª e a última de cada bloco ficam no lugar. Trocas de capo/afinação: <b>' + antes + ' → ' + depois + '</b>.'
                    : 'Abre forte, alterna agitadas e calmas sem duas lentas seguidas e fecha com a mais rápida (pelo BPM). Músicas sem BPM ficam no meio.') + '</p>' +
                '<div class="lista" style="max-height:46vh;overflow:auto">' + novo.map(it => it.tipo === 'bloco' ? '<div class="bloco-rep"><span class="bl-nome">' + esc(it.nome || 'Bloco') + '</span></div>' : linha(it, ++n)).join('') + '</div>' +
                '<p class="dica">Vira uma <b>nova ordem</b> do repertório: a ordem atual continua salva.</p>' +
                '<button class="bt prim cheio" id="oi-salvar">' + icone('check') + 'Usar esta ordem</button>',
                sh => {
                    sh.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => mostrar(b.dataset.modo));
                    sh.querySelector('#oi-salvar').onclick = async () => {
                        const ativa = r.ordens.find(o => o.id === r.ativa);
                        if (ativa) ativa.itens = r.itens;                      // guarda a ordem atual antes de trocar
                        const o = { id: DB.novoId(), nome: modo === 'trocas' ? 'Menos trocas' : 'Energia do show', itens: novo.map(it => Object.assign({}, it)) };
                        r.ordens.push(o); r.ativa = o.id; r.itens = o.itens;
                        await DB.salvarRepertorio(r);
                        fecharSheet(); toast('Ordem "' + o.nome + '" criada'); App.recarregar();
                    };
                });
        }
        mostrar('trocas');
    }

    /* =====================================================================
       5. MODO BATERISTA
       ===================================================================== */

    /**
     * Esconde acordes e letra, deixa as SEÇÕES grandes com a "deixa" (1ª linha cantada)
     * e quantas frases cada parte tem. Compassos só aparecem se você ajustou
     * "compassos por frase" na rolagem por BPM (senão seria chute).
     * Recebe o #cifra-conteudo já desenhado. Devolve nada.
     */
    function aplicarBaterista(conteudo, m, ligado) {
        conteudo.classList.toggle('baterista', !!ligado);
        conteudo.querySelectorAll('.bat-info').forEach(x => x.remove());
        conteudo.querySelectorAll('.deixa').forEach(x => x.classList.remove('deixa'));
        if (!ligado) return;
        const temCompassos = m.compassosPorFrase && Object.keys(m.compassosPorFrase).length > 0;
        // Cada <section class="bloco"> é uma parte da música; estrofes sem nome (linha em branco) também contam.
        const partes = [];
        conteudo.querySelectorAll('section.bloco').forEach(sec => {
            let atual = null;
            [...sec.children].forEach(el => {
                if (el.classList.contains('l-secao') || !atual) { atual = { cab: el.classList.contains('l-secao') ? el : null, linhas: [], frases: new Set(), primeiro: el }; partes.push(atual); }
                if (el.classList.contains('l-vazia')) { atual = null; return; }
                if (el.dataset.frase !== undefined) atual.frases.add(+el.dataset.frase);
                if (el.classList.contains('l-letra') || el.classList.contains('l-reflow')) atual.linhas.push(el);
            });
        });
        partes.filter(p => p.frases.size || p.cab).forEach(p => {
            const deixa = p.linhas[0];
            if (deixa) deixa.classList.add('deixa');
            const frases = [...p.frases];
            let txt = frases.length + ' frase' + (frases.length === 1 ? '' : 's');
            if (temCompassos && frases.length && global.RolagemBPM) txt += ' · ' + frases.reduce((s, f) => s + RolagemBPM.compassosDaFrase(m, f), 0) + ' compassos';
            const info = document.createElement('span');
            info.className = 'bat-info';
            info.textContent = txt;
            if (p.cab) p.cab.appendChild(info);
            else { const d = document.createElement('div'); d.className = 'l l-secao bat-info'; d.textContent = 'Parte · ' + txt; p.primeiro.before(d); }
        });
    }

    /** Barra do baterista (BPM grande + metrônomo visual). Devolve a função que para o metrônomo. */
    function barraBaterista(antesDe, m) {
        let barra = document.getElementById('bat-barra');
        if (barra) barra.remove();
        barra = document.createElement('div');
        barra.id = 'bat-barra';
        barra.innerHTML = '<div><b>' + (m.bpm || '—') + '</b><small>BPM · ' + esc(m.compasso || '4/4') + '</small></div>' +
            '<button class="bt prim" id="bat-metro">' + icone('play') + 'Metrônomo</button>';
        antesDe.before(barra);
        let pulso = null;
        const parar = () => { if (pulso) { pulso.parar(); pulso = null; } const b = document.getElementById('bat-metro'); if (b) b.innerHTML = icone('play') + 'Metrônomo'; };
        barra.querySelector('#bat-metro').onclick = () => {
            if (pulso) { parar(); return; }
            if (!m.bpm) { toast('Defina o BPM da música'); return; }
            const inicio = performance.now() + 150;
            pulso = Metronomo.pulso({ bpm: m.bpm, compasso: m.compasso, tempo: () => performance.now() - inicio, som: 'sempre' });
            barra.querySelector('#bat-metro').innerHTML = icone('pause') + 'Parar';
        };
        return () => { parar(); barra.remove(); };
    }

    global.ShowAjuda = { sugerirEmenda, diferencas, desenharProxima, abrirOrdem, ordenarTrocas, ordenarEnergia, aplicarBaterista, barraBaterista, acordeNaPonta };
})(window);
