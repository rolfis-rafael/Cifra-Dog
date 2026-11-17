/*
 * ============================================================
 *  cifra-pagina.js — Liga os botões da página da cifra (cifra.php)
 * ============================================================
 *  Usa o CifraMotor (cifra-motor.js) para desenhar a cifra e o
 *  CD (app.js) para avisos e chamadas à API.
 *
 *  Partes (procure pelos títulos ===):
 *   1. ESTADO ............ o que está escolhido (tom, capo, fonte…) e onde salva
 *   2. DESENHAR .......... desenhar() — redesenha cifra, faixa, acordes, tablatura
 *   3. TOM E CAPO ........ botões de tom, ♯/♭, trilho do capotraste, sugestão
 *   4. EXIBIÇÃO .......... simplificar, colunas, fonte, esconder tab
 *   5. POPOVER ........... diagrama que aparece ao clicar num acorde
 *   6. ROLAGEM ........... rolagem automática suave
 *   7. METRÔNOMO ......... Web Audio + tap tempo
 *   8. MODO PALCO ........ tela cheia com letras grandes
 *   9. SOCIAL ............ avaliação, repertório, comentários, compartilhar
 *  10. ATALHOS ........... teclado
 * ============================================================
 */
(function () {
    'use strict';

    const M = window.CifraMotor;
    const D = window.CIFRADOG;
    const musica = D.musica;
    const $ = (id) => document.getElementById(id);

    // =====================================================================
    // === 1. ESTADO =======================================================
    // =====================================================================
    // Preferências DA MÚSICA (tom, capo…) ficam salvas por música.
    // Preferências GERAIS (fonte, colunas…) valem para todas as cifras.
    const CHAVE_MUSICA = 'cifradog:musica:' + musica.id;
    const CHAVE_GERAL = 'cifradog:preferencias';

    /* Lê um JSON do localStorage sem quebrar se estiver bloqueado ou vazio. */
    function ler(chave) {
        try { return JSON.parse(localStorage.getItem(chave)) || {}; } catch (e) { return {}; }
    }
    /* Salva um objeto no localStorage (ignora erro em navegação privada). */
    function gravar(chave, valor) {
        try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem problema */ }
    }

    const salvoMusica = ler(CHAVE_MUSICA);
    const salvoGeral = ler(CHAVE_GERAL);
    const doLink = Number(new URLSearchParams(location.search).get('t'));

    const estado = {
        semitons: D.repertorio && D.repertorio.semitons !== null ? D.repertorio.semitons
                : (doLink ? doLink : (salvoMusica.semitons || 0)),
        capo: salvoMusica.capo || 0,
        acid: salvoMusica.acid || 'auto',             // 'auto', 'sus' ou 'bem'
        simplificar: !!salvoMusica.simplificar,
        colunas: !!salvoGeral.colunas,
        ocultarTab: !!salvoGeral.ocultarTab,
        faixa: salvoGeral.faixa !== false,
        fonte: salvoGeral.fonte || 100,               // em %
        rolVel: salvoGeral.rolVel || 4,
        instrumento: salvoGeral.instrumento || 'violao',
    };

    // Se a música não tem tom cadastrado, tenta descobrir pelos acordes.
    let tomDetectado = false;
    if (!M.analisarAcorde(musica.tom || '')) {
        musica.tom = M.detectarTom(musica.cifra);
        tomDetectado = !!musica.tom;
    }

    /* Guarda o estado atual (chamado depois de cada mudança). */
    function salvar() {
        gravar(CHAVE_MUSICA, { semitons: estado.semitons, capo: estado.capo, acid: estado.acid, simplificar: estado.simplificar });
        gravar(CHAVE_GERAL, { colunas: estado.colunas, ocultarTab: estado.ocultarTab, faixa: estado.faixa, fonte: estado.fonte, rolVel: estado.rolVel, instrumento: estado.instrumento });
    }

    /* Converte a opção ♯/♭ em true/false/'auto' para o motor. */
    function bemolEscolhido() {
        return estado.acid === 'auto' ? 'auto' : estado.acid === 'bem';
    }

    // =====================================================================
    // === 2. DESENHAR =====================================================
    // =====================================================================

    let acordesAtuais = [];

    /* Redesenha tudo que depende do tom/capo/opções. */
    function desenhar() {
        const r = M.renderizarCifra(musica.cifra, {
            semitons: estado.semitons, capo: estado.capo, bemol: bemolEscolhido(),
            tom: musica.tom, simplificar: estado.simplificar,
        });
        acordesAtuais = r.acordes;

        const saida = $('cifra-saida');
        saida.innerHTML = r.html;
        saida.classList.toggle('duas-colunas', estado.colunas);
        saida.classList.toggle('sem-tab', estado.ocultarTab);
        document.querySelector('.cifra-pagina').style.setProperty('--escala-fonte', estado.fonte / 100);

        // Atalhos para as seções (Intro, Refrão…).
        $('secoes-nav').innerHTML = r.secoes.length > 1
            ? r.secoes.map(s => '<a href="#' + s.id + '" class="secao-link">' + CD.esc(s.nome) + '</a>').join('')
            : '';

        // Faixa com mini-diagramas de todos os acordes.
        const faixa = $('faixa-acordes');
        faixa.hidden = !estado.faixa || !r.acordes.length;
        faixa.innerHTML = r.acordes.map(a =>
            '<button class="faixa-item" data-ac="' + CD.esc(a) + '"><b>' + CD.esc(a) + '</b>' + M.svgViolao(a) + '</button>').join('');

        // Aba "Acordes": grade grande, no instrumento escolhido.
        $('num-acordes').textContent = r.acordes.length || '';
        $('grade-acordes').innerHTML = r.acordes.map(a =>
            '<div class="cartao-acorde" data-ac="' + CD.esc(a) + '"><b>' + CD.esc(a) + '</b>' +
            (estado.instrumento === 'teclado' ? M.svgTeclado(a) : M.svgViolao(a)) +
            '<small>' + M.notasDoAcorde(a).join(' · ') + '</small></div>').join('')
            || '<p class="vazio">Nenhum acorde encontrado nesta cifra.</p>';

        // Aba "Tablatura": só aparece se existir tablatura.
        $('aba-tab').hidden = !r.temTab;
        if (r.temTab) $('tab-saida').innerHTML = M.renderizarTabs(musica.cifra, estado.semitons - estado.capo);

        atualizarPainelTom();
        desenharCapo();
        salvar();
    }

    /* Atualiza os textos de tom (painel, chip do topo e barra flutuante). */
    function atualizarPainelTom() {
        const tomAtual = musica.tom ? M.transporTom(musica.tom, estado.semitons, bemolEscolhido()) : '?';
        $('tom-atual').textContent = tomAtual;
        $('bf-tom').textContent = tomAtual;

        let chip = tomAtual + (tomDetectado ? ' (detectado)' : '');
        if (estado.capo && musica.tom) chip += ' · forma de ' + M.transporTom(musica.tom, estado.semitons - estado.capo, bemolEscolhido());
        $('chip-tom').textContent = chip;
        $('chip-capo-wrap').hidden = !estado.capo;
        $('chip-capo').textContent = estado.capo + 'ª';

        const s = estado.semitons;
        $('tom-diferenca').textContent = s === 0 ? 'original' : (s > 0 ? '+' : '') + s + ' semitom' + (Math.abs(s) > 1 ? 's' : '');
    }

    // =====================================================================
    // === 3. TOM E CAPO ===================================================
    // =====================================================================

    /* Muda o tom em "passo" semitons (mantém entre -11 e +11). */
    function transpor(passo) {
        // 12 semitons = uma oitava = mesmo tom, então dá a volta.
        estado.semitons += passo;
        if (estado.semitons > 11) estado.semitons -= 12;
        if (estado.semitons < -11) estado.semitons += 12;
        desenhar();
    }
    $('tom-menos').onclick = () => transpor(-1);
    $('tom-mais').onclick = () => transpor(1);
    $('bf-menos').onclick = () => transpor(-1);
    $('bf-mais').onclick = () => transpor(1);
    $('tom-original').onclick = () => { estado.semitons = 0; desenhar(); };

    // Botões Auto / ♯ / ♭
    const acidentes = $('acidentes');
    function marcarAcidentes() {
        acidentes.querySelectorAll('button').forEach(b => b.classList.toggle('ativo', b.dataset.acid === estado.acid));
    }
    acidentes.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        estado.acid = b.dataset.acid;
        marcarAcidentes();
        desenhar();
    });

    /* Desenha o "trilho" do capotraste: botões da casa 0 até a 9. */
    function desenharCapo() {
        // AJUSTAR: até qual casa o capotraste pode ir.
        const MAX_CAPO = 9;
        let html = '';
        for (let c = 0; c <= MAX_CAPO; c++) {
            html += '<button data-capo="' + c + '" class="' + (c === estado.capo ? 'ativo' : '') + '">' + (c === 0 ? 'Sem' : c) + '</button>';
        }
        $('capo-trilho').innerHTML = html;
    }
    $('capo-trilho').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-capo]');
        if (!b) return;
        estado.capo = Number(b.dataset.capo);
        $('capo-sugestao').hidden = true;
        desenhar();
    });

    // "Sugerir": mostra as 3 posições de capo com menos pestanas.
    $('sugerir-capo').onclick = () => {
        const opcoes = M.sugerirCapo(musica.cifra, estado.semitons).slice(0, 3);
        const caixa = $('capo-sugestao');
        caixa.innerHTML = '<div class="sug-cab">Menos pestana primeiro:</div>' + opcoes.map(o =>
            '<button data-capo="' + o.capo + '"><b>' + (o.capo ? 'Capo ' + o.capo : 'Sem capo') + '</b>' +
            '<small>' + o.acordes.slice(0, 6).join(' ') + (o.acordes.length > 6 ? '…' : '') + '</small>' +
            '<span class="' + (o.pestanas ? 'pestana-sim' : 'pestana-nao') + '">' + (o.pestanas ? o.pestanas + ' c/ pestana' : 'sem pestana!') + '</span></button>').join('');
        caixa.hidden = false;
    };
    $('capo-sugestao').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-capo]');
        if (!b) return;
        estado.capo = Number(b.dataset.capo);
        $('capo-sugestao').hidden = true;
        desenhar();
        CD.toast(estado.capo ? 'Capotraste na ' + estado.capo + 'ª casa' : 'Sem capotraste', 'sucesso');
    });

    // =====================================================================
    // === 4. EXIBIÇÃO =====================================================
    // =====================================================================

    /* Liga um checkbox a uma opção do estado e redesenha quando mudar. */
    function ligarChave(id, campo) {
        const el = $(id);
        el.checked = estado[campo];
        el.addEventListener('change', () => { estado[campo] = el.checked; desenhar(); });
    }
    ligarChave('op-simplificar', 'simplificar');
    ligarChave('op-colunas', 'colunas');
    ligarChave('op-ocultar-tab', 'ocultarTab');
    ligarChave('op-faixa', 'faixa');

    /* Aumenta/diminui a fonte em passos de 10% (entre 70% e 200%). */
    function mudarFonte(passo) {
        // AJUSTAR: limites do tamanho da fonte.
        estado.fonte = Math.min(200, Math.max(70, estado.fonte + passo));
        $('fonte-valor').textContent = estado.fonte + '%';
        desenhar();
    }
    $('fonte-menos').onclick = () => mudarFonte(-10);
    $('fonte-mais').onclick = () => mudarFonte(10);
    $('fonte-valor').textContent = estado.fonte + '%';

    // Violão x teclado na aba Acordes.
    const instrumento = $('instrumento');
    function marcarInstrumento() {
        instrumento.querySelectorAll('button').forEach(b => b.classList.toggle('ativo', b.dataset.inst === estado.instrumento));
    }
    instrumento.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-inst]');
        if (!b) return;
        estado.instrumento = b.dataset.inst;
        marcarInstrumento();
        desenhar();
    });

    // =====================================================================
    // === 5. POPOVER DO ACORDE ============================================
    // =====================================================================
    const popover = $('popover-acorde');

    /* Abre o cartão com violão + teclado + notas, ao lado do elemento clicado. */
    function abrirPopover(acorde, alvo) {
        popover.innerHTML = '<div class="pop-cab"><b>' + CD.esc(acorde) + '</b><small>' + M.notasDoAcorde(acorde).join(' · ') + '</small></div>' +
            '<div class="pop-corpo">' + M.svgViolao(acorde) + M.svgTeclado(acorde) + '</div>';
        popover.hidden = false;
        const r = alvo.getBoundingClientRect();
        const larg = popover.offsetWidth;
        let x = r.left + r.width / 2 - larg / 2 + window.scrollX;
        x = Math.max(8 + window.scrollX, Math.min(x, window.scrollX + document.documentElement.clientWidth - larg - 8));
        popover.style.left = x + 'px';
        popover.style.top = (r.bottom + window.scrollY + 8) + 'px';
    }
    document.addEventListener('click', (ev) => {
        const alvo = ev.target.closest('.ac, .faixa-item, .cartao-acorde');
        if (alvo) {
            ev.stopPropagation();
            abrirPopover(alvo.dataset.ac, alvo);
        } else if (!ev.target.closest('#popover-acorde')) {
            popover.hidden = true;
        }
    });

    // =====================================================================
    // === 6. ROLAGEM AUTOMÁTICA ===========================================
    // =====================================================================
    // Usa requestAnimationFrame: rola alguns pixels por quadro, de forma suave,
    // e guarda a "sobra" de fração de pixel para não travar em velocidades baixas.
    let rolando = false;
    let ultimoQuadro = 0;
    let sobra = 0;

    /* Converte a velocidade 1–10 em pixels por segundo. */
    function pixelsPorSegundo() {
        // AJUSTAR: velocidade mínima (6 px/s) e quanto cada nível acrescenta (9 px/s).
        return 6 + (estado.rolVel - 1) * 9;
    }

    function quadro(agora) {
        if (!rolando) return;
        if (ultimoQuadro) {
            sobra += pixelsPorSegundo() * (agora - ultimoQuadro) / 1000;
            const passo = Math.floor(sobra);
            if (passo >= 1) {
                window.scrollBy(0, passo);
                sobra -= passo;
            }
            // Chegou no fim da página: para sozinho.
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
                alternarRolagem(false);
                return;
            }
        }
        ultimoQuadro = agora;
        requestAnimationFrame(quadro);
    }

    /* Liga/desliga a rolagem. Sem parâmetro, inverte. */
    function alternarRolagem(ligar) {
        rolando = ligar === undefined ? !rolando : ligar;
        ultimoQuadro = 0;
        sobra = 0;
        const icone = rolando ? 'fa-pause' : 'fa-play';
        $('rolagem-botao').innerHTML = '<i class="fa-solid ' + icone + '"></i> ' + (rolando ? 'Pausar' : 'Rolar');
        $('bf-rolar').innerHTML = '<i class="fa-solid ' + icone + '"></i>';
        document.body.classList.toggle('rolando', rolando);
        if (rolando) requestAnimationFrame(quadro);
    }

    /* Ajusta a velocidade (1 a 10). */
    function mudarVelocidade(v) {
        estado.rolVel = Math.min(10, Math.max(1, v));
        $('rolagem-vel').value = estado.rolVel;
        $('rolagem-valor').textContent = estado.rolVel;
        salvar();
    }
    $('rolagem-botao').onclick = () => alternarRolagem();
    $('bf-rolar').onclick = () => alternarRolagem();
    $('bf-lento').onclick = () => mudarVelocidade(estado.rolVel - 1);
    $('bf-rapido').onclick = () => mudarVelocidade(estado.rolVel + 1);
    $('rolagem-vel').addEventListener('input', (ev) => mudarVelocidade(Number(ev.target.value)));
    mudarVelocidade(estado.rolVel);

    // =====================================================================
    // === 7. METRÔNOMO ====================================================
    // =====================================================================
    // O som é agendado alguns milissegundos à frente pelo Web Audio, que é
    // muito mais preciso que setInterval puro (que atrasa quando a aba pesa).
    let audio = null;
    let metroLigado = false;
    let proximaBatida = 0;
    let batida = 0;
    let timerMetro = null;
    let taps = [];

    function bpm() { return Math.min(260, Math.max(30, Number($('metro-bpm').value) || 90)); }
    function compasso() { return Number($('metro-compasso').value); }

    /* Desenha as bolinhas do compasso. */
    function desenharLuzes() {
        $('metro-luzes').innerHTML = Array.from({ length: compasso() }, (_, i) => '<span class="' + (i === 0 ? 'forte' : '') + '"></span>').join('');
    }

    /* Toca um "tic" no tempo exato "quando" (forte = primeiro tempo). */
    function clique(quando, forte) {
        const osc = audio.createOscillator();
        const vol = audio.createGain();
        // AJUSTAR: frequência do tempo forte (1600 Hz) e dos fracos (1000 Hz).
        osc.frequency.value = forte ? 1600 : 1000;
        vol.gain.setValueAtTime(0.0001, quando);
        vol.gain.exponentialRampToValueAtTime(forte ? 0.6 : 0.35, quando + 0.002);
        vol.gain.exponentialRampToValueAtTime(0.0001, quando + 0.05);
        osc.connect(vol).connect(audio.destination);
        osc.start(quando);
        osc.stop(quando + 0.06);
    }

    /* Agenda as batidas que caem nos próximos 100 ms. Roda a cada 25 ms. */
    function agendar() {
        while (proximaBatida < audio.currentTime + 0.1) {
            const n = batida % compasso();
            clique(proximaBatida, n === 0);
            // Acende a bolinha certa na hora em que o som tocar.
            const atraso = Math.max(0, (proximaBatida - audio.currentTime) * 1000);
            setTimeout(() => {
                document.querySelectorAll('#metro-luzes span').forEach((s, i) => s.classList.toggle('acesa', i === n));
            }, atraso);
            proximaBatida += 60 / bpm();
            batida++;
        }
    }

    /* Liga/desliga o metrônomo. */
    function alternarMetronomo() {
        metroLigado = !metroLigado;
        if (metroLigado) {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            audio.resume();
            batida = 0;
            proximaBatida = audio.currentTime + 0.05;
            timerMetro = setInterval(agendar, 25);
        } else {
            clearInterval(timerMetro);
            document.querySelectorAll('#metro-luzes span').forEach(s => s.classList.remove('acesa'));
        }
        $('metro-botao').innerHTML = metroLigado ? '<i class="fa-solid fa-stop"></i> Parar' : '<i class="fa-solid fa-play"></i> Tocar';
    }
    $('metro-botao').onclick = alternarMetronomo;
    $('metro-menos').onclick = () => { $('metro-bpm').value = bpm() - 1; };
    $('metro-mais').onclick = () => { $('metro-bpm').value = bpm() + 1; };
    $('metro-compasso').onchange = () => { batida = 0; desenharLuzes(); };

    // Tap tempo: a média dos últimos toques vira o BPM.
    $('metro-tap').onclick = () => {
        const agora = performance.now();
        if (taps.length && agora - taps[taps.length - 1] > 2000) taps = []; // parou de tocar: recomeça
        taps.push(agora);
        if (taps.length > 5) taps.shift();
        if (taps.length >= 2) {
            const media = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
            $('metro-bpm').value = Math.round(60000 / media);
        }
    };
    desenharLuzes();

    // =====================================================================
    // === 8. MODO PALCO ===================================================
    // =====================================================================

    /* Entra/sai do modo palco: tela cheia, só a cifra e letras grandes. */
    function alternarPalco(ligar) {
        const ligado = ligar === undefined ? !document.body.classList.contains('modo-palco') : ligar;
        document.body.classList.toggle('modo-palco', ligado);
        if (ligado) {
            document.querySelector('[data-abas]').abrirAba('cifra', true);
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
    $('modo-palco').onclick = () => alternarPalco(true);
    $('bf-sair-palco').onclick = () => alternarPalco(false);
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) document.body.classList.remove('modo-palco');
    });

    // Ferramentas no celular viram uma gaveta.
    $('bf-ferramentas').onclick = () => $('ferramentas').classList.add('aberta');
    $('ferramentas-fechar').onclick = () => $('ferramentas').classList.remove('aberta');

    // =====================================================================
    // === 9. SOCIAL =======================================================
    // =====================================================================

    // --- Avaliação com estrelas ---
    const avaliar = $('avaliar');
    function marcarEstrelas(nota) {
        avaliar.querySelectorAll('button').forEach(b => b.classList.toggle('cheia', Number(b.dataset.nota) <= nota));
    }
    marcarEstrelas(Number(avaliar.dataset.nota));
    avaliar.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-nota]');
        if (!b) return;
        const r = await CD.api('api/avaliar.php', { musica_id: musica.id, nota: Number(b.dataset.nota) });
        avaliar.dataset.nota = b.dataset.nota;
        marcarEstrelas(Number(b.dataset.nota));
        $('media-texto').textContent = 'Média ' + r.media.toFixed(1).replace('.', ',') + ' · ' + r.total + ' voto(s)';
        CD.toast('Valeu pela nota! ⭐', 'sucesso');
    });

    // --- Repertórios ---
    const botaoRep = $('btn-add-rep');
    const popRep = $('popover-rep');
    botaoRep.addEventListener('click', (ev) => { ev.stopPropagation(); popRep.hidden = !popRep.hidden; });
    document.addEventListener('click', (ev) => { if (!ev.target.closest('.menu-repertorio')) popRep.hidden = true; });

    const listaReps = $('lista-reps');
    if (listaReps) {
        listaReps.addEventListener('change', async (ev) => {
            const cb = ev.target;
            try {
                await CD.api('api/repertorio.php', { acao: cb.checked ? 'adicionar' : 'remover', repertorio_id: Number(cb.dataset.rep), musica_id: musica.id, semitons: estado.semitons });
                CD.toast(cb.checked ? 'Adicionada ao repertório' : 'Removida do repertório', 'sucesso');
            } catch (e) { cb.checked = !cb.checked; }
        });
        $('form-novo-rep').addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const campo = ev.target.querySelector('input');
            const r = await CD.api('api/repertorio.php', { acao: 'criar', nome: campo.value, musica_id: musica.id, semitons: estado.semitons });
            listaReps.insertAdjacentHTML('beforeend', '<label class="check-linha"><input type="checkbox" data-rep="' + r.id + '" checked> ' + CD.esc(r.nome) + '</label>');
            campo.value = '';
            CD.toast('Repertório criado com esta música 🎸', 'sucesso');
        });
    }

    const salvarTomRep = $('salvar-tom-rep');
    if (salvarTomRep) {
        salvarTomRep.onclick = async () => {
            await CD.api('api/repertorio.php', { acao: 'semitons', repertorio_id: D.repertorio.id, musica_id: musica.id, semitons: estado.semitons });
            CD.toast('Tom salvo no repertório: ' + $('tom-atual').textContent, 'sucesso');
        };
    }

    // --- Compartilhar (copia o link já no tom escolhido) ---
    $('btn-compartilhar').onclick = async () => {
        const url = location.origin + location.pathname + '?id=' + musica.id + (estado.semitons ? '&t=' + estado.semitons : '');
        try {
            if (navigator.share && /Mobi/.test(navigator.userAgent)) await navigator.share({ title: musica.titulo, url });
            else { await navigator.clipboard.writeText(url); CD.toast('Link copiado' + (estado.semitons ? ' (no tom ' + $('tom-atual').textContent + ')' : ''), 'sucesso'); }
        } catch (e) { /* usuário cancelou */ }
    };

    // --- Comentários ---
    const formComent = $('form-comentario');
    if (formComent) {
        formComent.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const campo = formComent.querySelector('textarea');
            const r = await CD.api('api/comentar.php', { acao: 'criar', musica_id: musica.id, texto: campo.value });
            const c = r.comentario;
            const art = document.createElement('article');
            art.className = 'comentario novo';
            art.innerHTML = '<span class="avatar" style="background:' + c.cor + '">' + CD.esc(c.iniciais) + '</span><div><div class="comentario-topo"><a href="perfil.php?id=' + c.usuario_id + '">' + CD.esc(c.username) + '</a><small>agora mesmo</small><button class="link-perigo" data-apagar-comentario="' + c.id + '">apagar</button></div><p></p></div>';
            art.querySelector('p').textContent = c.texto;
            $('lista-comentarios').prepend(art);
            const vazio = $('sem-comentarios');
            if (vazio) vazio.remove();
            campo.value = '';
            $('num-coment').textContent = document.querySelectorAll('.comentario').length;
        });
    }
    $('lista-comentarios').addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-apagar-comentario]');
        if (!b || !confirm('Apagar este comentário?')) return;
        await CD.api('api/comentar.php', { acao: 'excluir', id: Number(b.dataset.apagarComentario) });
        b.closest('.comentario').remove();
        $('num-coment').textContent = document.querySelectorAll('.comentario').length || '';
    });

    // =====================================================================
    // === 10. ATALHOS DO TECLADO ==========================================
    // =====================================================================
    $('ver-atalhos').onclick = () => $('janela-atalhos').showModal();

    document.addEventListener('keydown', (ev) => {
        if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const tecla = ev.key;
        const abas = document.querySelector('[data-abas]');

        if (tecla === '+' || tecla === '=') transpor(1);
        else if (tecla === '-' || tecla === '_') transpor(-1);
        else if (tecla === '0') { estado.semitons = 0; desenhar(); }
        else if (tecla === ' ') { ev.preventDefault(); alternarRolagem(); }
        else if (tecla === 'ArrowUp' && rolando) { ev.preventDefault(); mudarVelocidade(estado.rolVel + 1); }
        else if (tecla === 'ArrowDown' && rolando) { ev.preventDefault(); mudarVelocidade(estado.rolVel - 1); }
        else if (tecla === 's' || tecla === 'S') { $('op-simplificar').click(); }
        else if (tecla === 'c' || tecla === 'C') { $('op-colunas').click(); }
        else if (tecla === 'm' || tecla === 'M') alternarMetronomo();
        else if (tecla === 'p' || tecla === 'P') alternarPalco();
        else if (tecla === 'Escape') { alternarPalco(false); popover.hidden = true; $('ferramentas').classList.remove('aberta'); }
        else if (tecla === '?') $('janela-atalhos').showModal();
        else if (tecla === 'ArrowLeft' && $('rep-anterior')) location.href = $('rep-anterior').href;
        else if (tecla === 'ArrowRight' && $('rep-proxima')) location.href = $('rep-proxima').href;
        else if (/^[1-6]$/.test(tecla)) {
            const visiveis = Array.from(abas.querySelectorAll('[data-aba]')).filter(b => !b.hidden);
            const alvo = visiveis[Number(tecla) - 1];
            if (alvo) abas.abrirAba(alvo.dataset.aba, true);
        }
    });

    // ---------- Primeira pintura ----------
    $('letra-saida').innerHTML = M.renderizarLetra(musica.cifra) || '<p class="vazio">Sem letra.</p>';
    marcarAcidentes();
    marcarInstrumento();
    desenhar();
})();
