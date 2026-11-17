/*
 * metronomo.js — Contagem de entrada e pontinhos do tempo.
 *
 * Usado pela rolagem programada, pela rolagem por BPM e pelo show programado (karaokê).
 *
 *   Metronomo.pulso({ bpm, compasso, tempo, som, aoTerminarContagem })
 *     tempo(): ms em relação ao TEMPO 1 da primeira linha.
 *              Negativo = ainda na contagem de entrada (ex.: -2000 = faltam 2 s para entrar).
 *     som:     'contagem' (só os cliques de entrada) | 'sempre' (clique em todos os tempos) | 'nunca'
 *     Mostra no topo da tela 3, 4... pontinhos (um por tempo do compasso) e, na contagem,
 *     um número grande (4, 3, 2, 1) para a pessoa saber quando entrar.
 *     externo: true = depois da contagem, os pontinhos passam a ser marcados por ctrl.marcar(pos)
 *              (a rolagem por BPM usa isso para seguir o próprio relógio, que muda com o BPM).
 *     Devolve { parar(), definirSom(modo), marcar(pos) }.
 *
 *   Metronomo.batidasDeEntrada(compasso): quantos cliques tem a contagem
 *     (um compasso; em 2/4 e 6/8 são dois compassos, para dar uns 4 cliques).
 *   Metronomo.msDeEntrada(bpm, compasso): duração da contagem em ms.
 */
(function (global) {
    'use strict';

    const temposPorCompasso = (c) => (global.RolagemBPM ? RolagemBPM.temposPorCompasso(c) : 4);
    const batidasDeEntrada = (c) => { const n = temposPorCompasso(c); return n < 3 ? n * 2 : n; };
    const msDeEntrada = (bpm, c) => batidasDeEntrada(c) * 60000 / (bpm || 100);

    /* Um único AudioContext para o app inteiro (o navegador limita quantos podem existir). */
    let ctx = null;
    function audio() {
        try {
            ctx = ctx || new (global.AudioContext || global.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        } catch (e) { ctx = null; }
        return ctx;
    }
    /* "Tec" agendado para daqui a `emMs` milissegundos. forte = tempo 1 do compasso. */
    function clique(forte, emMs) {
        const a = audio(); if (!a) return;
        try {
            const o = a.createOscillator(), g = a.createGain();
            o.frequency.value = forte ? 1500 : 900;
            const t = a.currentTime + Math.max(0, (emMs || 0) / 1000);
            g.gain.setValueAtTime(forte ? 0.55 : 0.3, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.07);
        } catch (e) { /* sem áudio: fica só o visual */ }
    }

    let ativo = null; // só um pulso na tela por vez

    function pulso(op) {
        if (ativo) ativo.parar();
        const n = temposPorCompasso(op.compasso);
        const batida = 60000 / (op.bpm || 100);
        const entrada = batidasDeEntrada(op.compasso);
        let som = op.som || 'contagem';

        const el = document.createElement('div');
        el.className = 'compasso-pulso';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<span class="compasso-pontos">' + '<i></i>'.repeat(n) + '</span>';
        const num = document.createElement('div');
        num.className = 'compasso-contagem'; num.hidden = true;
        num.setAttribute('aria-live', 'assertive');
        document.body.append(el, num);
        const pontos = [...el.querySelectorAll('i')];

        let raf = 0, ultimaBatida = null, agendada = null, terminou = false;
        const tocar = (b) => som === 'sempre' || (som === 'contagem' && b < 0 && b >= -entrada);

        function laco() {
            const t = op.tempo();
            const b = Math.floor(t / batida); // nº da batida (negativa = contagem)
            // Agenda o clique da PRÓXIMA batida um pouco antes, para soar no tempo exato.
            const prox = b + 1, falta = prox * batida - t;
            if (falta < 70 && agendada !== prox && tocar(prox)) { agendada = prox; clique(((prox % n) + n) % n === 0, falta); }
            if (b !== ultimaBatida) {
                if (ultimaBatida === null && tocar(b) && agendada !== b && t - b * batida < 40) clique(((b % n) + n) % n === 0, 0);
                ultimaBatida = b;
                const pos = ((b % n) + n) % n;
                pontos.forEach((p, i) => { p.classList.toggle('on', i === pos); p.classList.toggle('forte', i === 0); });
                el.classList.toggle('contando', b < 0);
                if (b < 0 && b >= -entrada) { num.hidden = false; num.textContent = String(-b); num.classList.remove('bate'); void num.offsetWidth; num.classList.add('bate'); }
                else num.hidden = true;
                if (b >= 0 && !terminou) {
                    terminou = true; if (op.aoTerminarContagem) op.aoTerminarContagem();
                    if (op.externo) return; // daqui em diante quem marca os pontinhos é o dono (ctrl.marcar)
                }
            }
            raf = requestAnimationFrame(laco);
        }
        audio(); // destrava o áudio enquanto ainda estamos no toque do usuário
        raf = requestAnimationFrame(laco);

        const ctrl = {
            parar() { cancelAnimationFrame(raf); el.remove(); num.remove(); if (ativo === ctrl) ativo = null; },
            definirSom(m) { som = m; },
            /* Acende o pontinho do tempo `pos` (0 = tempo 1). Usado no modo externo. */
            marcar(pos) { pontos.forEach((p, i) => { p.classList.toggle('on', i === pos); p.classList.toggle('forte', i === 0); }); el.classList.remove('contando'); num.hidden = true; },
        };
        ativo = ctrl;
        return ctrl;
    }

    /* Aviso grande e rápido no meio da tela (ex.: "Rolagem Programada!"). */
    function celebrar(titulo, sub) {
        const v = document.createElement('div');
        v.className = 'aviso-grande'; v.setAttribute('role', 'status');
        v.innerHTML = '<b></b>' + (sub ? '<small></small>' : '');
        v.querySelector('b').textContent = titulo;
        if (sub) v.querySelector('small').textContent = sub;
        document.body.append(v);
        if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
        setTimeout(() => v.classList.add('saindo'), 1900);
        setTimeout(() => v.remove(), 2400);
    }

    global.Metronomo = { pulso, clique, celebrar, batidasDeEntrada, msDeEntrada, temposPorCompasso };
})(window);
