/*
 * voz.js — Tom para a sua voz (item 7) e capotraste mais fácil (item 8).
 * ---------------------------------------------------------------------------
 * PARA QUE SERVE
 *   - "Minha extensão vocal": você canta a nota mais grave e a mais aguda que
 *     alcança com conforto (microfone) ou escolhe na lista. Fica salvo no
 *     aparelho (prefs().voz = { grave, agudo }, em números MIDI: 60 = C4).
 *   - "Tom para a minha voz": compara a sua extensão com a da música
 *     (m.extensao, no tom ORIGINAL) e sugere quantos meios-tons transpor.
 *     Sem a extensão da música, faz uma ESTIMATIVA pelo tom (avisa na tela).
 *   - "Capotraste mais fácil": usa CifraMotor.sugerirCapo para achar o capo
 *     que deixa a música com menos pestanas, no tom que está na tela.
 *
 * PARTES
 *   1. NOTAS ............ nomeMidi, seletorNota
 *   2. MICROFONE ........ ouvir() (detecção de altura por autocorrelação, a mesma ideia do afinador)
 *   3. CÁLCULO .......... sugerirTons(voz, musica)
 *   4. PAINÉIS .......... abrirExtensao, abrirTom, abrirCapo
 *
 * Usado pela tela da cifra (telas.js → abrirAjustes).
 */
(function (global) {
    'use strict';
    const { icone, esc, toast, abrirSheet, fecharSheet, prefs, salvarPrefs } = UI;

    /* =====================================================================
       1. NOTAS
       ===================================================================== */
    const NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // AJUSTAR: faixa de notas oferecida nas listas (36 = C2, 84 = C6).
    const MIDI_MIN = 36, MIDI_MAX = 84;
    // AJUSTAR: folga (meios-tons) que a sugestão tenta deixar longe dos seus limites.
    const FOLGA = 1;

    /** 60 -> "C4" (dó central). */
    function nomeMidi(n) { return NOMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1); }

    /** <select> com as notas de C2 a C6 (`valor` vem selecionado) + botão ♪ que toca a nota escolhida. */
    function seletorNota(id, valor) {
        let h = '<select class="entrada" id="' + id + '">';
        for (let n = MIDI_MIN; n <= MIDI_MAX; n++) h += '<option value="' + n + '"' + (n === valor ? ' selected' : '') + '>' + nomeMidi(n) + '</option>';
        return h + '</select><button type="button" class="mini-bt" data-ouvir="' + id + '" aria-label="Ouvir a nota">♪</button>';
    }

    /** Toca a nota (MIDI) por ~1 s, com timbre suave, para conferir de ouvido. AJUSTAR: duração e volume. */
    let ctxNota = null;
    function tocarNota(midi) {
        try {
            ctxNota = ctxNota || new AudioContext();
            const t = ctxNota.currentTime, o = ctxNota.createOscillator(), g = ctxNota.createGain();
            o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
            o.connect(g); g.connect(ctxNota.destination); o.start(t); o.stop(t + 1.15);
        } catch (e) { /* sem áudio: tudo bem */ }
    }

    /* =====================================================================
       2. MICROFONE
       ===================================================================== */

    /**
     * Acha a frequência fundamental de um trecho de áudio (autocorrelação).
     * Recebe as amostras e a taxa; devolve a nota em MIDI (com fração) ou null se não deu para ouvir.
     * AJUSTAR: 70–1100 Hz cobre da voz grave masculina ao agudo feminino.
     */
    function alturaMidi(data, taxa) {
        let rms = 0;
        for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
        if (rms / data.length < 0.0001) return null;           // silêncio
        const min = Math.floor(taxa / 1100), max = Math.min(data.length / 2, Math.floor(taxa / 70));
        const n = data.length - max;
        let melhor = 0, lag = 0;
        for (let d = min; d < max; d++) {
            let dot = 0, a = 0, b = 0;
            for (let i = 0; i < n; i++) { dot += data[i] * data[i + d]; a += data[i] * data[i]; b += data[i + d] * data[i + d]; }
            const s = dot / Math.sqrt(a * b || 1);
            if (s > melhor) { melhor = s; lag = d; }
            if (melhor > 0.95 && s < melhor - 0.05) break;     // passou do primeiro pico forte (evita pegar a oitava de baixo)
        }
        if (!lag || melhor < 0.85) return null;
        return 69 + 12 * Math.log2(taxa / lag / 440);
    }

    /**
     * Liga o microfone e chama aoOuvir(midiArredondado) a cada nota ESTÁVEL
     * (a mesma nota em 4 leituras seguidas). Devolve uma função que desliga tudo.
     */
    async function ouvir(aoOuvir, aoErro) {
        let stream, ctx, raf, parado = false;
        const parar = () => { parado = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); if (ctx) ctx.close().catch(() => {}); };
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
            if (parado) { parar(); return parar; }
            ctx = new AudioContext(); await ctx.resume();
            const an = ctx.createAnalyser(); an.fftSize = 4096;
            ctx.createMediaStreamSource(stream).connect(an);
            const buf = new Float32Array(an.fftSize);
            let ultimo = 0, igual = 0, anterior = null;
            const tick = (t) => {
                if (parado) return;
                if (t - ultimo > 60) {
                    ultimo = t;
                    an.getFloatTimeDomainData(buf);
                    const m = alturaMidi(buf, ctx.sampleRate);
                    const nota = m === null ? null : Math.round(m);
                    igual = nota !== null && nota === anterior ? igual + 1 : 0;
                    anterior = nota;
                    if (igual >= 3) aoOuvir(nota);
                }
                raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        } catch (e) {
            parar();
            if (aoErro) aoErro('Microfone indisponível. Use HTTPS ou localhost e permita o acesso. Você pode escolher a nota na lista.');
        }
        return parar;
    }

    /**
     * Liga os botões "Cantar" de um painel: enquanto ouve, guarda a nota mais
     * grave (modo 'grave') ou mais aguda ('agudo') e escreve no <select>.
     * Devolve a função que desliga o microfone (chamada ao fechar o painel).
     */
    function ligarCaptura(sh) {
        let pararMic = null, modo = null;
        const status = sh.querySelector('[data-voz-status]');
        sh.querySelectorAll('[data-ouvir]').forEach(b => b.onclick = () => tocarNota(+sh.querySelector('#' + b.dataset.ouvir).value));
        const parar = () => { if (pararMic) pararMic(); pararMic = null; modo = null; sh.querySelectorAll('[data-cantar]').forEach(b => b.textContent = 'Cantar'); };
        sh.querySelectorAll('[data-cantar]').forEach(b => b.onclick = async () => {
            const alvo = b.dataset.cantar;
            if (modo === alvo) { parar(); status.textContent = 'Pronto.'; return; }
            parar();
            modo = alvo; b.textContent = 'Parar';
            const sel = sh.querySelector('#' + b.dataset.sel);
            let marca = null;
            status.textContent = alvo === 'grave' ? 'Cante a nota mais GRAVE e segure…' : 'Cante a nota mais AGUDA e segure…';
            pararMic = await ouvir(nota => {
                if (nota < MIDI_MIN || nota > MIDI_MAX) return;
                if (marca === null || (alvo === 'grave' ? nota < marca : nota > marca)) { marca = nota; sel.value = String(nota); }
                status.textContent = 'Ouvindo: ' + nomeMidi(nota) + ' · ' + (alvo === 'grave' ? 'mais grave' : 'mais aguda') + ' até agora: ' + nomeMidi(marca);
            }, msg => { status.textContent = msg; parar(); });
        });
        return parar;
    }

    /* =====================================================================
       3. CÁLCULO
       ===================================================================== */

    /**
     * Extensão da música no tom original. Se não estiver gravada, estima pelo tom:
     * uma melodia típica vai da 5ª abaixo da tônica até a 6ª acima (AJUSTAR abaixo).
     * Devolve { grave, agudo, estimada }.
     */
    function extensaoDaMusica(m) {
        if (m.extensao && Number.isInteger(m.extensao.grave) && Number.isInteger(m.extensao.agudo)) return Object.assign({ estimada: false }, m.extensao);
        const a = CifraMotor.analisarAcorde(m.tom || 'C');
        const tonica = 48 + (a ? a.raiz : 0);              // tônica na oitava 3; a oitava certa é testada no cálculo
        return { grave: tonica - 5, agudo: tonica + 9, estimada: true };
    }

    /**
     * Testa todas as transposições (−6 a +5 meios-tons) e as oitavas acima/abaixo
     * (homem cantando música de mulher e vice-versa). Nota = quanto "sobra" fora da
     * sua extensão (com folga). Devolve as 3 melhores: [{ semitons, oitava, sobra }].
     */
    function sugerirTons(voz, ext) {
        const ops = [];
        for (let s = -6; s <= 5; s++) {
            for (const o of [-12, 0, 12]) {
                const g = ext.grave + s + o, a = ext.agudo + s + o;
                const sobra = Math.max(0, voz.grave + FOLGA - g) + Math.max(0, a - (voz.agudo - FOLGA));
                const centro = Math.abs((g + a) / 2 - (voz.grave + voz.agudo) / 2);
                ops.push({ semitons: s, oitava: o, sobra, centro });
            }
        }
        ops.sort((x, y) => x.sobra - y.sobra || Math.abs(x.oitava) - Math.abs(y.oitava) || x.centro - y.centro || Math.abs(x.semitons) - Math.abs(y.semitons));
        const vistas = new Set(), melhores = [];
        for (const op of ops) { if (vistas.has(op.semitons)) continue; vistas.add(op.semitons); melhores.push(op); if (melhores.length === 3) break; }
        return melhores;
    }

    /* =====================================================================
       4. PAINÉIS
       ===================================================================== */

    /** Painel "Minha extensão vocal". Ao salvar, chama depois() (se houver). */
    function abrirExtensao(depois) {
        const v = prefs().voz || { grave: 48, agudo: 67 };
        let pararCaptura = null, salvou = false;
        abrirSheet(
            '<h3 style="margin:0 0 6px">Minha extensão vocal</h3>' +
            '<p class="dica" style="margin:0 0 10px">Cante a nota mais grave e a mais aguda que você alcança <b>sem forçar</b>, ou escolha na lista. Fica salvo neste aparelho.</p>' +
            '<div class="ajuste"><span>Mais grave</span><div class="aj-ctrl">' + seletorNota('vz-grave', v.grave) + '<button class="bt" data-cantar="grave" data-sel="vz-grave">Cantar</button></div></div>' +
            '<div class="ajuste"><span>Mais aguda</span><div class="aj-ctrl">' + seletorNota('vz-agudo', v.agudo) + '<button class="bt" data-cantar="agudo" data-sel="vz-agudo">Cantar</button></div></div>' +
            '<p class="dica" data-voz-status role="status">Dica: C4 é o dó central. Voz masculina costuma ir de ~E2 a G4; feminina de ~A3 a E5.</p>' +
            '<button class="bt prim cheio" id="vz-salvar">' + icone('check') + 'Salvar</button>',
            sh => {
                pararCaptura = ligarCaptura(sh);
                sh.querySelector('#vz-salvar').onclick = () => {
                    const g = +sh.querySelector('#vz-grave').value, a = +sh.querySelector('#vz-agudo').value;
                    if (a - g < 5) { toast('A aguda precisa ficar pelo menos 5 meios-tons acima da grave'); return; }
                    salvarPrefs({ voz: { grave: g, agudo: a } }); salvou = true; fecharSheet();
                    toast('Extensão salva: ' + nomeMidi(g) + ' a ' + nomeMidi(a));
                };
            },
            () => { if (pararCaptura) pararCaptura(); if (salvou && depois) setTimeout(depois, 50); }
        );
    }

    /**
     * Painel "Tom para a minha voz".
     * op: { semitons (atual na tela), aplicar(s), salvarExtensao(ext) }
     */
    function abrirTom(m, op) {
        const voz = prefs().voz;
        if (!voz) { toast('Primeiro, grave a sua extensão vocal'); abrirExtensao(() => abrirTom(m, op)); return; }
        const ext = extensaoDaMusica(m);
        const sug = sugerirTons(voz, ext);
        const tomCom = s => CifraMotor.transporTom(m.tom || 'C', s);
        const linha = (x, i) => {
            const g = ext.grave + x.semitons + x.oitava, a = ext.agudo + x.semitons + x.oitava;
            const nota = x.sobra === 0 ? 'cabe na sua voz' : 'passa ' + x.sobra + ' meio-tom' + (x.sobra > 1 ? 's' : '') + ' do seu limite';
            return '<button class="op" data-s="' + x.semitons + '">' + icone(i === 0 ? 'estrela' : 'nota') +
                '<span class="op-txt">Tom ' + esc(tomCom(x.semitons)) + (x.semitons ? ' (' + (x.semitons > 0 ? '+' : '') + x.semitons + ')' : ' (original)') +
                (x.semitons === op.semitons ? ' · atual' : '') + '<br><small>' + nomeMidi(g) + ' a ' + nomeMidi(a) + ' · ' + nota +
                (x.oitava ? ' · cantando uma oitava ' + (x.oitava < 0 ? 'abaixo' : 'acima') : '') + '</small></span></button>';
        };
        let pararCaptura = null;
        abrirSheet(
            '<h3 style="margin:0 0 4px">Tom para a minha voz</h3>' +
            '<p class="dica" style="margin:0 0 8px">Sua voz: ' + nomeMidi(voz.grave) + ' a ' + nomeMidi(voz.agudo) + ' · <a href="#" id="vz-mudar">mudar</a></p>' +
            (ext.estimada ? '<p class="dica" style="margin:0 0 8px">⚠ Esta música ainda não tem a extensão da melodia. Usei uma <b>estimativa</b> pelo tom. Para acertar, informe abaixo a nota mais grave e a mais aguda da melodia no tom original (' + esc(m.tom || '?') + ').</p>' : '') +
            '<div class="lista">' + sug.map(linha).join('') + '</div>' +
            '<details class="mais"' + (ext.estimada ? ' open' : '') + '><summary>Extensão da melodia (tom original)</summary>' +
            '<div class="ajuste"><span>Mais grave</span><div class="aj-ctrl">' + seletorNota('vz-mg', ext.grave) + '<button class="bt" data-cantar="grave" data-sel="vz-mg">Cantar</button></div></div>' +
            '<div class="ajuste"><span>Mais aguda</span><div class="aj-ctrl">' + seletorNota('vz-ma', ext.agudo) + '<button class="bt" data-cantar="agudo" data-sel="vz-ma">Cantar</button></div></div>' +
            '<p class="dica" data-voz-status role="status">Cante junto com a gravação original (ou toque a melodia).</p>' +
            '<button class="bt cheio" id="vz-ext-salvar">Salvar extensão da música</button></details>',
            sh => {
                pararCaptura = ligarCaptura(sh);
                sh.querySelector('#vz-mudar').onclick = (e) => { e.preventDefault(); fecharSheet(); setTimeout(() => abrirExtensao(() => abrirTom(m, op)), 50); };
                sh.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { op.aplicar(+b.dataset.s); fecharSheet(); toast('Tom ' + tomCom(+b.dataset.s)); });
                sh.querySelector('#vz-ext-salvar').onclick = () => {
                    const g = +sh.querySelector('#vz-mg').value, a = +sh.querySelector('#vz-ma').value;
                    if (a <= g) { toast('A nota aguda precisa ficar acima da grave'); return; }
                    m.extensao = { grave: g, agudo: a };
                    op.salvarExtensao(m.extensao);
                    fecharSheet(); setTimeout(() => abrirTom(m, op), 50);
                };
            },
            () => { if (pararCaptura) pararCaptura(); }
        );
    }

    /**
     * Painel "Capotraste mais fácil" (usa o tom que está na tela).
     * op: { semitons, capo (atual), aplicar(capo) }
     */
    function abrirCapo(m, op) {
        if (!(m.cifra || '').trim()) { toast('A música ainda não tem cifra'); return; }
        const ops = CifraMotor.sugerirCapo(m.cifra, op.semitons);
        if (!ops.length) { toast('Não achei acordes nesta cifra'); return; }
        const semCapo = ops.find(x => x.capo === 0);
        const top = ops.slice(0, 3);
        const tomSoa = CifraMotor.transporTom(m.tom || 'C', op.semitons);
        abrirSheet(
            '<h3 style="margin:0 0 4px">Capotraste mais fácil</h3>' +
            '<p class="dica" style="margin:0 0 8px">Para soar em <b>' + esc(tomSoa) + '</b> com menos pestanas. Sem capo: ' + semCapo.pestanas + ' acorde' + (semCapo.pestanas === 1 ? '' : 's') + ' com pestana.</p>' +
            (top[0].capo === 0 ? '<p class="dica">Sem capotraste já é o jeito mais fácil.</p>' : '') +
            '<div class="lista">' + top.map((x, i) =>
                '<button class="op" data-capo="' + x.capo + '">' + icone(i === 0 ? 'estrela' : 'violao') +
                '<span class="op-txt">' + (x.capo ? 'Capo na ' + x.capo + 'ª casa' : 'Sem capo') + (x.capo === op.capo ? ' · atual' : '') +
                '<br><small>' + (x.pestanas ? x.pestanas + ' com pestana' : 'nenhuma pestana') + ' · formas: ' + esc(x.acordes.slice(0, 8).join(' ')) + '</small></span></button>').join('') + '</div>',
            sh => sh.querySelectorAll('[data-capo]').forEach(b => b.onclick = () => {
                op.aplicar(+b.dataset.capo); fecharSheet();
                toast(+b.dataset.capo ? 'Capo na ' + b.dataset.capo + 'ª casa' : 'Sem capotraste');
            })
        );
    }

    global.Voz = { tocarNota, nomeMidi, alturaMidi, sugerirTons, extensaoDaMusica, abrirExtensao, abrirTom, abrirCapo };
})(window);
