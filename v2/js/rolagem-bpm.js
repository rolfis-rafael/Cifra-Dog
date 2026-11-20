/*
 * rolagem-bpm.js — Rolagem por BPM.
 *
 * Como funciona:
 *   - A cifra é dividida em FRASES (cada uma = linha de acordes + linha de letra, data-frase="N").
 *   - O app conta os tempos pelo BPM e pelo compasso da música.
 *   - A cada tempo 1 do compasso (o "clique forte") ele conta um compasso; quando a frase completa
 *     os compassos dela (padrão 1), desce para a próxima e a marca com o marca-texto leve (.frase-ativa).
 *   - Clique sonoro opcional: forte no tempo 1, fraco nos outros.
 *
 * Compassos por frase: musica.compassosPorFrase = { padrao: 1, "3": 2, ... }
 *   (índice da frase -> quantos compassos ela dura; "padrao" vale para as que não têm valor próprio).
 *
 * Tempos por compasso: 4/4 = 4 · 3/4 = 3 · 2/4 = 2 · 7/4 = 7 · 6/8 = 2 · 12/8 = 4
 *   (em compasso composto, o BPM é o da semínima pontuada, como se conta no 6/8 e 12/8).
 */
(function (global) {
    'use strict';

    /* Quantos tempos "contados" tem um compasso. */
    function temposPorCompasso(compasso) {
        const m = /^(\d+)\s*\/\s*(\d+)$/.exec(compasso || '4/4');
        if (!m) return 4;
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        return (b === 8 && a % 3 === 0) ? a / 3 : a; // 6/8 -> 2, 12/8 -> 4
    }

    const RolagemBPM = {
        temposPorCompasso,

        /* Compassos que a frase N dura (valor próprio, senão o padrão, senão 1). */
        compassosDaFrase(musica, n) {
            const c = musica.compassosPorFrase || {};
            return Math.max(1, parseInt(c[n] != null ? c[n] : c.padrao, 10) || 1);
        },

        /* Marca visualmente a frase N e rola a tela até ela. */
        marcarFrase(container, n) {
            container.querySelectorAll('.frase-ativa').forEach(el => el.classList.remove('frase-ativa'));
            const linhas = container.querySelectorAll('[data-frase="' + n + '"]');
            linhas.forEach(el => el.classList.add('frase-ativa'));
            // Se a pessoa está arrastando a tela, só marca a frase: puxar a tela contra o dedo atrapalha.
            // A próxima frase volta a centralizar normalmente depois que ela soltar.
            if (linhas[0] && !(global.UI && UI.usuarioRolando && UI.usuarioRolando())) {
                // Mantém a frase um pouco acima do meio da tela, para dar para ler o que vem depois.
                const y = linhas[0].getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.32;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            }
        },

        limparMarca(container) {
            if (container) container.querySelectorAll('.frase-ativa').forEach(el => el.classList.remove('frase-ativa'));
        },

        /*
         * Cria um "tocador" para uma música aberta.
         * opcoes: { container, musica, clique (bool), aoMudar(estado) }
         * Devolve { iniciar(), parar(), irPara(n), ativo(), frase(), definirClique(bool) }
         */
        criar(opcoes) {
            const { container, musica } = opcoes;
            let clique = !!opcoes.clique;
            let ativo = false, timer = 0, ctx = null;
            let frase = 0, compassoNaFrase = 0, tempoNoCompasso = 0, proximo = 0;
            let pulso = null; // pontinhos do tempo + contagem de entrada (js/metronomo.js)
            const pararPulso = () => { if (pulso) { pulso.parar(); pulso = null; } };

            const totalFrases = () => {
                let max = -1;
                container.querySelectorAll('[data-frase]').forEach(el => { max = Math.max(max, parseInt(el.dataset.frase, 10)); });
                return max + 1;
            };
            const avisar = () => { if (opcoes.aoMudar) opcoes.aoMudar({ ativo, frase }); };

            /* "Tec": som curto no tempo exato. forte = tempo 1 do compasso. */
            function tec(forte, quando) {
                if (!clique) return;
                try {
                    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
                    const o = ctx.createOscillator(), g = ctx.createGain();
                    o.frequency.value = forte ? 1500 : 900;
                    const t = ctx.currentTime + Math.max(0, (quando - performance.now()) / 1000);
                    g.gain.setValueAtTime(forte ? 0.5 : 0.28, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.07);
                } catch (e) { /* sem áudio: segue só visual */ }
            }

            /* Dispara um tempo. No tempo 1 de cada compasso, decide se troca de frase. */
            function bater(quando) {
                const tempos = temposPorCompasso(musica.compasso);
                const forte = tempoNoCompasso === 0;
                tec(forte, quando);
                if (pulso) { const pos = tempoNoCompasso, atraso = Math.max(0, quando - performance.now()); setTimeout(() => pulso && pulso.marcar(pos), atraso); }
                if (forte) {
                    const fim = totalFrases();
                    if (compassoNaFrase >= this.compassosDaFrase(musica, frase)) {
                        compassoNaFrase = 0; frase++;
                        if (frase >= fim) { frase = fim - 1; ctrl.parar(); return; } // acabou a cifra
                    }
                    if (compassoNaFrase === 0) { this.marcarFrase(container, frase); avisar(); }
                    compassoNaFrase++;
                }
                tempoNoCompasso = (tempoNoCompasso + 1) % tempos;
            }

            /* Relógio: confere a cada 20 ms e dispara os tempos na hora certa (sem acumular atraso). */
            function laco() {
                if (!ativo) return;
                const duracao = 60000 / musica.bpm;
                const agora = performance.now();
                while (ativo && proximo <= agora + 30) { bater.call(RolagemBPM, proximo); proximo += duracao; }
                if (ativo) timer = setTimeout(laco, 20);
            }

            const ctrl = {
                ativo: () => ativo,
                frase: () => frase,
                definirClique(v) { clique = !!v; },
                iniciar(aPartirDe) {
                    if (!musica.bpm || musica.bpm < 20) return false;
                    if (!totalFrases()) return false;
                    this.parar(true);
                    frase = Math.max(0, aPartirDe || 0); compassoNaFrase = 0; tempoNoCompasso = 0;
                    // Contagem de entrada: uns 4 cliques antes da primeira linha, para saber quando entrar.
                    const entrada = global.Metronomo ? Metronomo.msDeEntrada(musica.bpm, musica.compasso) : 0;
                    ativo = true; proximo = performance.now() + 120 + entrada;
                    if (ctx && ctx.state === 'suspended') ctx.resume();
                    const inicio = proximo;
                    if (global.Metronomo) pulso = Metronomo.pulso({ bpm: musica.bpm, compasso: musica.compasso, tempo: () => performance.now() - inicio, som: 'contagem', externo: true });
                    RolagemBPM.marcarFrase(container, frase); // a linha de entrada já aparece durante a contagem
                    laco(); avisar(); return true;
                },
                parar(silencioso) {
                    ativo = false; clearTimeout(timer); pararPulso();
                    if (!silencioso) avisar();
                },
                /* Pula para a frase N (continua tocando se estava tocando). */
                irPara(n) {
                    frase = Math.max(0, Math.min(n, totalFrases() - 1));
                    compassoNaFrase = 0; tempoNoCompasso = 0;
                    RolagemBPM.marcarFrase(container, frase);
                    if (ativo) proximo = performance.now() + 120;
                    avisar();
                },
                destruir() { ativo = false; clearTimeout(timer); pararPulso(); RolagemBPM.limparMarca(container); if (ctx) { try { ctx.close(); } catch (e) { /* ok */ } ctx = null; } },
            };
            return ctrl;
        },
    };

    global.RolagemBPM = RolagemBPM;
})(window);
