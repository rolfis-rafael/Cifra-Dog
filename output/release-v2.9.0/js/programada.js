/*
 * programada.js — Rolagem programada.
 *
 * A pessoa programa QUAL linha (frase) a cifra mostra em cada momento:
 *   - Gravando enquanto ouve a música: toca a música, e a cada descida pisa o pedal
 *     (ou toca na linha). O app guarda a linha e o tempo de cada passo.
 *   - Pelo BPM: o app calcula o tempo de cada passo a partir do BPM e dos compassos.
 *   - Depois dá para ajustar o tempo de cada passo ou apagar passos.
 *
 * Ao tocar, cada passo rola a cifra até a linha programada e a marca com o marca-texto leve.
 *   - Avanço AUTOMÁTICO: passa para o próximo passo quando o tempo dele acaba.
 *   - Avanço MANUAL: espera o pedal (ou o botão de próximo na tela) para ir ao próximo passo.
 *   Nos dois modos o pedal também pode adiantar ou voltar um passo.
 *
 * Formato salvo na música:
 *   musica.programa = { passos: [ { f: <nº da frase>, ms: <duração do passo em ms, ou null> }, ... ], origem: 'ouvindo' | 'bpm', avanco: 'auto' | 'manual' }
 */
(function (global) {
    'use strict';

    const totalFrases = (container) => {
        let max = -1;
        container.querySelectorAll('[data-frase]').forEach(el => { max = Math.max(max, parseInt(el.dataset.frase, 10)); });
        return max + 1;
    };

    const Programada = {
        totalFrases,

        /* Passos calculados pelo BPM. agrupar = quantas frases descem de uma vez (1 = uma por uma). */
        pelosBpm(musica, container, agrupar) {
            const n = totalFrases(container), g = Math.max(1, agrupar || 1);
            const barra = RolagemBPM.temposPorCompasso(musica.compasso) * 60000 / (musica.bpm || 100);
            const passos = [];
            for (let i = 0; i < n; i += g) {
                let compassos = 0;
                for (let k = i; k < Math.min(n, i + g); k++) compassos += RolagemBPM.compassosDaFrase(musica, k);
                passos.push({ f: i, ms: Math.round(compassos * barra) });
            }
            return { passos, origem: 'bpm', avanco: (musica.programa && musica.programa.avanco) || 'auto' };
        },

        /* Texto curto da letra de uma frase (para a lista de passos). */
        resumoFrase(container, f) {
            const linhas = [...container.querySelectorAll('[data-frase="' + f + '"]')];
            const el = linhas.find(l => l.classList.contains('l-letra')) || linhas[0];
            const bruto = el && el.classList.contains('l-reflow') ? [...el.querySelectorAll('.rf-t')].map(x => x.textContent).join('') : (el && el.textContent);
            const t = (bruto || '').trim().replace(/\s+/g, ' ');
            return t.slice(0, 34) || '(só acordes)';
        },

        /*
         * Tocador. opcoes: { container, musica, aoMudar({ ativo, passo, total }) }
         * Devolve { iniciar(i), parar(), proximo(), anterior(), irPara(i), ativo(), indice(), total(), destruir() }
         */
        criar(opcoes) {
            const { container, musica } = opcoes;
            let ativo = false, indice = 0, timer = 0;
            const passos = () => ((musica.programa && musica.programa.passos) || []);
            const avisar = () => { if (opcoes.aoMudar) opcoes.aoMudar({ ativo, passo: indice, total: passos().length }); };
            const auto = () => !musica.programa || musica.programa.avanco !== 'manual';

            function mostrar() {
                const p = passos()[indice];
                if (!p) return;
                RolagemBPM.marcarFrase(container, p.f);
                clearTimeout(timer);
                if (ativo && auto() && p.ms != null && indice < passos().length - 1) timer = setTimeout(() => ctrl.proximo(true), Math.max(150, p.ms));
                avisar();
            }

            const ctrl = {
                ativo: () => ativo,
                indice: () => indice,
                total: () => passos().length,
                iniciar(i) {
                    if (!passos().length) return false;
                    indice = Math.max(0, Math.min(i || 0, passos().length - 1));
                    ativo = true; mostrar(); return true;
                },
                parar() { ativo = false; clearTimeout(timer); avisar(); },
                irPara(i) {
                    indice = Math.max(0, Math.min(i, passos().length - 1));
                    mostrar();
                },
                proximo(vindoDoTempo) {
                    if (indice >= passos().length - 1) { if (vindoDoTempo || ativo) ctrl.parar(); return; }
                    indice++; if (!ativo) ativo = true; mostrar();
                },
                anterior() { if (indice > 0) { indice--; if (!ativo) ativo = true; mostrar(); } },
                destruir() { ativo = false; clearTimeout(timer); RolagemBPM.limparMarca(container); },
            };
            return ctrl;
        },

        /*
         * Gravador: registra os passos enquanto a pessoa ouve a música.
         * opcoes: { container, aoMudar({ estado: 'espera'|'gravando', passos, ms }) }
         */
        gravar(opcoes) {
            const { container } = opcoes;
            let estado = 'espera', t0 = 0, passos = [], relogio = 0;
            const avisar = () => { if (opcoes.aoMudar) opcoes.aoMudar({ estado, passos: passos.length, ms: estado === 'gravando' ? performance.now() - t0 : 0 }); };
            const g = {
                estado: () => estado,
                comecar() {
                    estado = 'gravando'; t0 = performance.now(); passos = [{ f: 0, t: 0 }];
                    RolagemBPM.marcarFrase(container, 0);
                    relogio = setInterval(avisar, 250); avisar();
                },
                /* Marca um passo: f = frase escolhida (toque) ou a seguinte à última (pedal). */
                marcar(f) {
                    if (estado !== 'gravando') return;
                    const n = totalFrases(container);
                    const alvo = f != null ? f : Math.min(n - 1, passos[passos.length - 1].f + 1);
                    if (alvo === passos[passos.length - 1].f && f == null) return; // já está na última linha
                    passos.push({ f: alvo, t: Math.round(performance.now() - t0) });
                    RolagemBPM.marcarFrase(container, alvo); avisar();
                },
                desfazer() {
                    if (estado !== 'gravando' || passos.length <= 1) return;
                    passos.pop(); RolagemBPM.marcarFrase(container, passos[passos.length - 1].f); avisar();
                },
                /* Termina e devolve o programa pronto (a duração de cada passo é a diferença entre os tempos). */
                concluir(avanco) {
                    const fim = performance.now() - t0;
                    const lista = passos.map((p, i) => ({ f: p.f, ms: i < passos.length - 1 ? passos[i + 1].t - p.t : null }));
                    g.cancelar();
                    return { passos: lista, origem: 'ouvindo', avanco: avanco || 'auto', duracao: Math.round(fim) };
                },
                cancelar() { clearInterval(relogio); estado = 'espera'; RolagemBPM.limparMarca(container); },
            };
            return g;
        },
    };

    global.Programada = Programada;
})(window);
