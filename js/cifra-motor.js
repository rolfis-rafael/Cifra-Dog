/*
 * ============================================================
 *  cifra-motor.js — O "cérebro" musical do CifraDog
 * ============================================================
 *  Para que serve: entende o texto de uma cifra (o que é acorde,
 *  letra, tablatura ou seção), transpõe, simplifica, sugere capotraste,
 *  detecta o tom e desenha diagramas de acordes (violão e teclado).
 *
 *  Não mexe na página sozinho: só recebe texto e devolve texto/HTML.
 *  Quem usa ele é o cifra-pagina.js (página da cifra) e o editor.js.
 *  Tudo fica dentro de window.CifraMotor.
 *
 *  Seções (procure pelos títulos ===):
 *   1. NOTAS ................ nomes das notas, sustenido/bemol
 *   2. ACORDES .............. analisarAcorde(), ehAcorde(), qualidade()
 *   3. LINHAS ............... tipoLinha() — classifica cada linha
 *   4. TRANSPOSIÇÃO ......... transporAcorde(), simplificarAcorde(), transporTom()
 *   5. RENDERIZAÇÃO ......... renderizarCifra(), renderizarLetra(), transporTexto()
 *   6. TOM E CAPOTRASTE ..... detectarTom(), sugerirCapo()
 *   7. DIAGRAMAS ............ posicaoViolao(), svgViolao(), svgTeclado()
 *   8. CHORDPRO ............. chordProParaCifra() — converte "[C]letra"
 * ============================================================
 */
(function (global) {
    'use strict';

    // =====================================================================
    // === 1. NOTAS ========================================================
    // =====================================================================

    const SUSTENIDOS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const BEMOIS     = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const BASE_NOTA  = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

    // Tons que normalmente se escrevem com bemol (índice da tônica).
    const TONS_BEMOL_MAIOR = [5, 10, 3, 8, 1, 6];   // F, Bb, Eb, Ab, Db, Gb
    const TONS_BEMOL_MENOR = [2, 7, 0, 5, 10, 3];   // Dm, Gm, Cm, Fm, Bbm, Ebm

    /* Converte "C#", "Db", "E" em número de 0 a 11. Devolve -1 se não for nota. */
    function indiceNota(nome) {
        if (!nome || BASE_NOTA[nome[0]] === undefined) return -1;
        let i = BASE_NOTA[nome[0]];
        if (nome[1] === '#') i++;
        if (nome[1] === 'b') i--;
        return (i + 12) % 12;
    }

    /* Converte número 0–11 em nome de nota, com sustenido ou bemol. */
    function nomeNota(indice, usarBemol) {
        const i = ((indice % 12) + 12) % 12;
        return (usarBemol ? BEMOIS : SUSTENIDOS)[i];
    }

    // =====================================================================
    // === 2. ACORDES ======================================================
    // =====================================================================

    // Raiz + acidente + "sufixo" + baixo opcional. Ex.: "F#m7(b5)/A".
    // O sufixo aceita "/" só se vier número depois (ex.: C6/9).
    const RE_ACORDE = /^([A-G])([#b]?)((?:[^\/\s]|\/(?=\d))*)(?:\/([A-G])([#b]?))?$/;

    // Pedaços permitidos dentro do sufixo. Isso impede que palavras como
    // "Bom", "Dia" ou "Eu" sejam confundidas com acordes.
    const RE_SUFIXO = /^(?:maj|min|dim|aug|sus|add|alt|M|m|°|º|ø|\+|-|\d{1,2}|[#b](?=\d)|\(|\)|,|\/(?=\d))*$/;

    /*
     * Analisa um texto e diz se é acorde.
     * Devolve { raiz: 0–11, sufixo: 'm7', baixo: 0–11 ou null, bemol: bool } ou null.
     */
    function analisarAcorde(texto) {
        if (!texto || texto.length > 16) return null;
        const m = RE_ACORDE.exec(texto);
        if (!m) return null;
        if (!RE_SUFIXO.test(m[3])) return null;
        // Parênteses precisam estar fechados: "A7(9" não é acorde.
        if ((m[3].match(/\(/g) || []).length !== (m[3].match(/\)/g) || []).length) return null;
        return {
            raiz: indiceNota(m[1] + m[2]),
            sufixo: m[3],
            baixo: m[4] ? indiceNota(m[4] + m[5]) : null,
            bemol: m[2] === 'b' || m[5] === 'b',
        };
    }

    /* true se o texto for um acorde (ex.: "Am7"), false se não. */
    function ehAcorde(texto) {
        return analisarAcorde(texto) !== null;
    }

    /*
     * Descobre a "qualidade" do acorde a partir do sufixo, numa lista fechada
     * que os diagramas sabem desenhar: '', 'm', '7', 'm7', 'maj7', 'sus4',
     * 'sus2', 'dim', 'dim7', 'm7b5', 'aug', '6', 'm6', '9', 'add9', '7sus4', '5'.
     * Segue o costume brasileiro: "C9" = C com nona adicionada (add9)
     * e "C7(9)" = C com sétima e nona.
     */
    function qualidade(sufixo) {
        let s = (sufixo || '').replace(/[()\s,]/g, '').replace(/[°º]/g, 'dim').replace('ø', 'm7b5');
        if (s === '' || s === 'M') return '';
        if (s === '5') return '5';
        if (/^(m7b5|m7-5|min7b5|mb5)/.test(s)) return 'm7b5';
        if (/^dim7/.test(s)) return 'dim7';
        if (/^dim/.test(s)) return 'dim';
        if (/^(aug|\+|5\+|#5)/.test(s)) return 'aug';
        if (/^(maj|7M|M7|7\+|M)/.test(s)) return 'maj7';
        if (/^(min|m|-)/.test(s)) {
            const resto = s.replace(/^(min|m|-)/, '');
            if (resto === '' || /^(7M|maj|add|9$|\(9\))/.test(resto)) return 'm';
            if (/^(7|9|11)/.test(resto)) return 'm7';
            if (/^6/.test(resto)) return 'm6';
            return 'm';
        }
        if (/^7sus|^74|^7\/4/.test(s)) return '7sus4';
        if (/^(sus2|2$)/.test(s)) return 'sus2';
        if (/^(sus|4$)/.test(s)) return 'sus4';
        if (/^79|^9/.test(s) && /^7/.test(s)) return '9';
        if (/^(add9|add2|9$)/.test(s)) return 'add9';
        if (/^6/.test(s)) return '6';
        if (/^(7|11|13)/.test(s)) return '7';
        return '';
    }

    // Intervalos (em semitons a partir da raiz) de cada qualidade. Usado no teclado.
    const INTERVALOS = {
        '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10],
        'maj7': [0, 4, 7, 11], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7], 'dim': [0, 3, 6],
        'dim7': [0, 3, 6, 9], 'm7b5': [0, 3, 6, 10], 'aug': [0, 4, 8], '6': [0, 4, 7, 9],
        'm6': [0, 3, 7, 9], '9': [0, 4, 7, 10, 14], 'add9': [0, 4, 7, 14],
        '7sus4': [0, 5, 7, 10], '5': [0, 7],
    };

    /* Devolve os nomes das notas que formam o acorde. Ex.: "Am" -> ['A','C','E']. */
    function notasDoAcorde(texto) {
        const a = analisarAcorde(texto);
        if (!a) return [];
        const notas = INTERVALOS[qualidade(a.sufixo)].map(i => nomeNota(a.raiz + i, a.bemol));
        if (a.baixo !== null && a.baixo !== a.raiz) notas.unshift(nomeNota(a.baixo, a.bemol));
        return [...new Set(notas)];
    }

    // =====================================================================
    // === 3. LINHAS =======================================================
    // =====================================================================

    // Palavras que, sozinhas numa linha, indicam uma seção da música.
    // AJUSTAR: adicione nomes de seção aqui se quiser que mais sejam reconhecidos.
    const RE_SECAO_PALAVRA = /^\s*(intro|introdução|refrão|refrao|pré-refrão|pre-refrao|pré refrão|ponte|solo|verso|estrofe|primeira parte|segunda parte|terceira parte|parte \d+|final|outro|riff|interlúdio|interludio|coda|bridge|chorus|verse)\s*:?\s*$/i;

    /* true se a linha for de tablatura (ex.: "e|---0---3---|"). */
    function ehLinhaTab(linha) {
        return /^\s*[A-Ga-g][#b]?\s?[|:]/.test(linha) && (linha.match(/-/g) || []).length >= 3;
    }

    /*
     * Tira parênteses/colchetes em volta de um pedaço: "(A7)" -> "A7".
     * Devolve { antes, meio, depois }.
     */
    function separarPontuacao(pedaco) {
        const m = /^([(\[]*)(.*?)([)\],.;]*)$/.exec(pedaco);
        return { antes: m[1], meio: m[2], depois: m[3] };
    }

    /* Diz se um pedaço é acorde, aceitando parênteses em volta ("(A7)"). */
    function pedacoEhAcorde(pedaco) {
        if (ehAcorde(pedaco)) return true;
        const p = separarPontuacao(pedaco);
        return p.meio !== pedaco && ehAcorde(p.meio);
    }

    /* Pedaços que não contam nem como acorde nem como letra ("|", "2x", "Intro:"). */
    function pedacoNeutro(pedaco) {
        return /^[|\-–—.:%~*\/\\]+$/.test(pedaco)
            || /^\(?x?\d+x?\)?$/i.test(pedaco)
            || /^\(?\d+\s*vezes\)?$/i.test(pedaco)
            || /:$/.test(pedaco)
            || /^N\.?C\.?$/.test(pedaco);
    }

    /*
     * Classifica uma linha da cifra. Devolve um objeto com "tipo":
     *   'vazia'   — linha em branco
     *   'secao'   — [Refrão], [Intro] Em C G…  (nome + resto opcional)
     *   'tab'     — linha de tablatura
     *   'acordes' — linha com acordes (fica acima da letra)
     *   'letra'   — letra da música
     */
    function tipoLinha(linha) {
        if (!linha.trim()) return { tipo: 'vazia' };

        // [Algo] no começo: é seção, a não ser que "Algo" seja um acorde (ChordPro).
        const sec = /^\s*\[([^\]]{1,40})\]\s*(.*)$/.exec(linha);
        if (sec && !ehAcorde(sec[1].trim())) {
            return { tipo: 'secao', nome: sec[1].trim(), resto: sec[2] };
        }
        if (RE_SECAO_PALAVRA.test(linha)) {
            return { tipo: 'secao', nome: linha.trim().replace(/:$/, ''), resto: '' };
        }
        if (ehLinhaTab(linha)) return { tipo: 'tab' };

        // Conta acordes x palavras. Se a maioria for acorde, é linha de acordes.
        // (Isso evita pintar o "Em" de "Em casa eu fico" como acorde.)
        let acordes = 0, outros = 0;
        for (const pedaco of linha.split(/[\s|]+/)) {
            if (!pedaco) continue;
            if (pedacoEhAcorde(pedaco)) acordes++;
            else if (!pedacoNeutro(pedaco)) outros++;
        }
        // AJUSTAR: 0.6 = pelo menos 60% dos pedaços precisam ser acordes.
        if (acordes > 0 && acordes >= (acordes + outros) * 0.6) return { tipo: 'acordes' };
        return { tipo: 'letra' };
    }

    // =====================================================================
    // === 4. TRANSPOSIÇÃO =================================================
    // =====================================================================

    /* true se o tom (ex.: "F", "Dm", "Bb") costuma ser escrito com bemóis. */
    function tomUsaBemol(tom) {
        const a = analisarAcorde((tom || '').trim());
        if (!a) return false;
        if (/b/.test(tom.slice(1, 2))) return true;
        const menor = qualidade(a.sufixo) === 'm';
        return (menor ? TONS_BEMOL_MENOR : TONS_BEMOL_MAIOR).includes(a.raiz);
    }

    /* Transpõe o nome de um tom. Ex.: transporTom('Em', 2) -> 'F#m'. */
    function transporTom(tom, semitons, usarBemol) {
        const a = analisarAcorde((tom || '').trim());
        if (!a) return tom;
        const menor = qualidade(a.sufixo) === 'm' ? 'm' : '';
        if (usarBemol === undefined || usarBemol === 'auto') {
            // Escolhe sozinho: usa bemol se o tom de destino for um "tom de bemol" (F, Bb, Dm…).
            const idx = ((a.raiz + semitons) % 12 + 12) % 12;
            usarBemol = (menor ? TONS_BEMOL_MENOR : TONS_BEMOL_MAIOR).includes(idx);
        }
        return nomeNota(a.raiz + semitons, usarBemol) + menor;
    }

    /*
     * Transpõe um acorde em N semitons, mantendo o sufixo e o baixo.
     * Ex.: transporAcorde('D/F#', 2, false) -> 'E/G#'.
     */
    function transporAcorde(texto, semitons, usarBemol) {
        const a = analisarAcorde(texto);
        if (!a) return texto;
        let r = nomeNota(a.raiz + semitons, usarBemol) + a.sufixo;
        if (a.baixo !== null) r += '/' + nomeNota(a.baixo + semitons, usarBemol);
        return r;
    }

    /*
     * Deixa o acorde mais fácil: tira extensões e baixo.
     * Ex.: 'Cmaj7' -> 'C', 'Am7' -> 'Am', 'G/B' -> 'G', 'F#m7(b5)' -> 'F#m'.
     */
    function simplificarAcorde(texto) {
        const a = analisarAcorde(texto);
        if (!a) return texto;
        const q = qualidade(a.sufixo);
        const raiz = nomeNota(a.raiz, a.bemol);
        if (q === 'dim' || q === 'dim7' || q === 'm7b5' || q.startsWith('m')) return raiz + 'm';
        return raiz;
    }

    // =====================================================================
    // === 5. RENDERIZAÇÃO =================================================
    // =====================================================================

    /* Escapa texto para HTML. */
    function esc(t) {
        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /*
     * Reescreve uma linha de acordes trocando cada acorde por outro
     * (transposto, simplificado…) SEM desalinhar da letra de baixo.
     *
     * Por que é complicado: "C" virar "C#" ocupa 1 coluna a mais, e isso
     * empurraria todos os acordes seguintes. Então cada acorde é colocado
     * na MESMA coluna do original; só se não couber ele anda para a direita.
     *
     * Recebe: linha, função trocar(acorde) -> novo acorde, emHtml (true/false).
     * Devolve: a linha nova (texto ou HTML com <b class="ac">).
     */
    function refazerLinhaAcordes(linha, trocar, emHtml) {
        let saida = '';
        let tamanho = 0;      // quantas colunas visíveis já escrevemos
        let fimAnterior = 0;
        const re = /[^\s|]+/g;
        let m;
        while ((m = re.exec(linha)) !== null) {
            const pedaco = m[0];
            const coluna = m.index;
            const entre = linha.slice(fimAnterior, coluna);

            // Espaços entre pedaços: completa até a coluna original (mínimo 1 se havia espaço).
            if (/[^ ]/.test(entre)) {
                saida += emHtml ? esc(entre) : entre;
                tamanho += entre.length;
            }
            const falta = Math.max(coluna - tamanho, entre.length > 0 && !/[^ ]/.test(entre) ? 1 : 0);
            if (falta > 0 && !/[^ ]/.test(entre)) {
                saida += ' '.repeat(falta);
                tamanho += falta;
            }

            let novo = pedaco;
            let html = emHtml ? esc(pedaco) : pedaco;
            const p = ehAcorde(pedaco) ? { antes: '', meio: pedaco, depois: '' } : separarPontuacao(pedaco);
            if (ehAcorde(p.meio)) {
                const ac = trocar(p.meio);
                novo = p.antes + ac + p.depois;
                html = emHtml ? esc(p.antes) + '<b class="ac" data-ac="' + esc(ac) + '">' + esc(ac) + '</b>' + esc(p.depois) : novo;
            }
            saida += html;
            tamanho += novo.length;
            fimAnterior = coluna + pedaco.length;
        }
        const final = linha.slice(fimAnterior);
        if (/[^ ]/.test(final)) saida += emHtml ? esc(final) : final;
        return saida;
    }

    /*
     * Desloca as casas de uma linha de tablatura em N semitons.
     * Se alguma casa ficaria negativa, sobe tudo uma oitava (+12).
     * Mantém o alinhamento: se "9" vira "11", come um "-" depois.
     */
    function transporLinhaTab(linha, desloc) {
        if (!desloc) return linha;
        const inicio = linha.indexOf('|') + 1 || linha.indexOf(':') + 1;
        const cabeca = linha.slice(0, inicio);
        let corpo = linha.slice(inicio);
        const numeros = (corpo.match(/\d+/g) || []).map(Number);
        if (numeros.length && Math.min(...numeros) + desloc < 0) desloc += 12;

        let resultado = '';
        let i = 0;
        while (i < corpo.length) {
            const m = /^\d+/.exec(corpo.slice(i));
            if (!m) { resultado += corpo[i]; i++; continue; }
            const novo = String(Number(m[0]) + desloc);
            resultado += novo;
            i += m[0].length;
            let sobra = novo.length - m[0].length;
            while (sobra > 0 && corpo[i] === '-') { i++; sobra--; }
            if (sobra < 0) resultado += '-'.repeat(-sobra);
        }
        return cabeca + resultado;
    }

    /*
     * Transforma o texto inteiro da cifra em HTML pronto para a página.
     *
     * opcoes:
     *   semitons    — quanto transpor (ex.: 2, -1)
     *   capo        — casa do capotraste (os acordes mostrados descem esse tanto)
     *   bemol       — true, false ou 'auto' (decide pelo tom)
     *   tom         — tom original da música (para o modo 'auto')
     *   simplificar — true para tirar extensões dos acordes
     *
     * Devolve { html, acordes: [nomes únicos na ordem], secoes: [{id, nome}], temTab }.
     */
    function renderizarCifra(texto, opcoes) {
        const o = Object.assign({ semitons: 0, capo: 0, bemol: 'auto', tom: '', simplificar: false }, opcoes || {});
        const desloc = o.semitons - o.capo;
        const usarBemol = decidirBemol(o);

        const acordesVistos = [];
        const trocar = (ac) => {
            let novo = transporAcorde(ac, desloc, usarBemol);
            if (o.simplificar) novo = simplificarAcorde(novo);
            if (!acordesVistos.includes(novo)) acordesVistos.push(novo);
            return novo;
        };

        const linhas = normalizarTexto(texto).split('\n');
        const secoes = [];
        let html = '<section class="bloco">';
        let temTab = false;
        let vaziasSeguidas = 0;

        for (const linha of linhas) {
            const t = tipoLinha(linha);
            if (t.tipo === 'vazia') {
                vaziasSeguidas++;
                if (vaziasSeguidas <= 1) html += '<div class="l l-vazia"> </div>';
                continue;
            }
            vaziasSeguidas = 0;

            if (t.tipo === 'secao') {
                const id = 'sec-' + (secoes.length + 1);
                secoes.push({ id, nome: t.nome });
                // Cada seção abre um bloco novo (no modo 2 colunas, blocos não se partem).
                html += '</section><section class="bloco" id="' + id + '">';
                html += '<div class="l l-secao"><span class="secao-nome">' + esc(t.nome) + '</span>';
                if (t.resto.trim()) html += ' <span class="secao-resto">' + refazerLinhaAcordes(t.resto, trocar, true) + '</span>';
                html += '</div>';
            } else if (t.tipo === 'tab') {
                temTab = true;
                html += '<div class="l l-tab">' + esc(transporLinhaTab(linha, desloc)) + '</div>';
            } else if (t.tipo === 'acordes') {
                html += '<div class="l l-acordes">' + refazerLinhaAcordes(linha, trocar, true) + '</div>';
            } else {
                html += '<div class="l l-letra">' + esc(linha) + '</div>';
            }
        }
        html += '</section>';
        html = html.replace('<section class="bloco"></section>', '');

        return { html, acordes: acordesVistos, secoes, temTab };
    }

    /* Decide se mostra bemóis ou sustenidos, olhando a opção e o tom final. */
    function decidirBemol(o) {
        if (o.bemol === true || o.bemol === false) return o.bemol;
        if (!o.tom) return false;
        const a = analisarAcorde(o.tom);
        if (!a) return false;
        const menor = qualidade(a.sufixo) === 'm';
        const idx = ((a.raiz + o.semitons - o.capo) % 12 + 12) % 12;
        return (menor ? TONS_BEMOL_MENOR : TONS_BEMOL_MAIOR).includes(idx);
    }

    /* Só a letra: tira acordes e tablaturas, mantém os nomes das seções. */
    function renderizarLetra(texto) {
        let html = '';
        let ultimaVazia = true;
        for (const linha of normalizarTexto(texto).split('\n')) {
            const t = tipoLinha(linha);
            if (t.tipo === 'letra') {
                html += '<div class="l l-letra">' + esc(linha.trim()) + '</div>';
                ultimaVazia = false;
            } else if (t.tipo === 'secao') {
                if (!ultimaVazia) html += '<div class="l l-vazia"> </div>';
                html += '<div class="l l-secao"><span class="secao-nome">' + esc(t.nome) + '</span></div>';
                ultimaVazia = false;
            } else if (t.tipo === 'vazia' && !ultimaVazia) {
                html += '<div class="l l-vazia"> </div>';
                ultimaVazia = true;
            }
        }
        return html;
    }

    /* Só as tablaturas (com o nome da seção de cada uma). Devolve HTML ou '' se não houver. */
    function renderizarTabs(texto, desloc) {
        let html = '';
        let secaoAtual = '';
        let emTab = false;
        for (const linha of normalizarTexto(texto).split('\n')) {
            const t = tipoLinha(linha);
            if (t.tipo === 'secao') { secaoAtual = t.nome; continue; }
            if (t.tipo === 'tab') {
                if (!emTab) {
                    html += '<div class="tab-bloco">' + (secaoAtual ? '<div class="l l-secao"><span class="secao-nome">' + esc(secaoAtual) + '</span></div>' : '');
                    emTab = true;
                }
                html += '<div class="l l-tab">' + esc(transporLinhaTab(linha, desloc || 0)) + '</div>';
            } else if (emTab) {
                html += '</div>';
                emTab = false;
            }
        }
        if (emTab) html += '</div>';
        return html;
    }

    /*
     * Transpõe o TEXTO da cifra (sem HTML). Usado pelo editor no botão
     * "transpor o texto", que reescreve a cifra salva em outro tom.
     */
    function transporTexto(texto, semitons, usarBemol) {
        return normalizarTexto(texto).split('\n').map(linha => {
            const t = tipoLinha(linha);
            if (t.tipo === 'acordes') return refazerLinhaAcordes(linha, ac => transporAcorde(ac, semitons, usarBemol), false);
            if (t.tipo === 'secao' && t.resto.trim()) {
                return linha.replace(t.resto, refazerLinhaAcordes(t.resto, ac => transporAcorde(ac, semitons, usarBemol), false));
            }
            if (t.tipo === 'tab') return transporLinhaTab(linha, semitons);
            return linha;
        }).join('\n');
    }

    /* Troca \r\n do Windows por \n e tabs por espaços (tabs desalinham os acordes). */
    function normalizarTexto(texto) {
        // Remove caracteres invisíveis (espaço de largura zero, BOM…) que vêm junto ao copiar de sites
        // e quebravam o reconhecimento dos acordes; espaço não-separável vira espaço comum.
        return String(texto || '')
            .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
            .replace(/[\u00A0\u2007\u202F]/g, ' ')
            .replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    }

    /* Lista todos os acordes do texto original (sem repetir), na ordem em que aparecem. */
    function listarAcordes(texto) {
        return renderizarCifra(texto, { bemol: 'auto' }).acordes;
    }

    /* Conta quantas vezes cada acorde aparece. Devolve { 'Am': 4, 'C': 3, ... }. */
    function contarAcordes(texto) {
        const contagem = {};
        for (const linha of normalizarTexto(texto).split('\n')) {
            const t = tipoLinha(linha);
            const alvo = t.tipo === 'acordes' ? linha : (t.tipo === 'secao' ? t.resto : '');
            if (!alvo) continue;
            for (const pedaco of alvo.split(/[\s|]+/)) {
                const p = ehAcorde(pedaco) ? pedaco : separarPontuacao(pedaco).meio;
                if (ehAcorde(p)) contagem[p] = (contagem[p] || 0) + 1;
            }
        }
        return contagem;
    }

    // =====================================================================
    // === 6. TOM E CAPOTRASTE =============================================
    // =====================================================================

    /*
     * Tenta descobrir o tom da música olhando os acordes.
     * Para cada um dos 24 tons, dá pontos aos acordes que "pertencem" ao
     * campo harmônico dele. O primeiro e o último acorde valem mais,
     * porque músicas costumam começar/terminar na tônica.
     * Devolve o nome do tom (ex.: 'Am', 'G') ou '' se não achar acordes.
     */
    function detectarTom(texto) {
        const contagem = contarAcordes(texto);
        const nomes = Object.keys(contagem);
        if (!nomes.length) return '';

        const ordem = listarAcordes(texto);
        const primeiro = analisarAcorde(ordem[0]);
        const ultimo = analisarAcorde(ordem[ordem.length - 1]);

        // Graus do campo harmônico maior: [distância da tônica, é menor?]
        const GRAUS = [[0, false], [2, true], [4, true], [5, false], [7, false], [9, true]];
        let melhor = { pontos: -1, nome: '' };

        for (let tonica = 0; tonica < 12; tonica++) {
            let pontos = 0;
            for (const nome of nomes) {
                const a = analisarAcorde(nome);
                const menor = qualidade(a.sufixo).startsWith('m') && qualidade(a.sufixo) !== 'maj7';
                const dist = (a.raiz - tonica + 12) % 12;
                if (GRAUS.some(([d, m]) => d === dist && m === menor)) pontos += contagem[nome];
                if (dist === 4 && !menor) pontos += contagem[nome] * 0.5; // dominante do relativo menor (E7 em Am)
            }
            // Maior ou relativo menor? Decide pelo primeiro/último acorde.
            const relativo = (tonica + 9) % 12;
            const candidatos = [
                { nome: nomeNota(tonica, false), raiz: tonica, menor: false },
                { nome: nomeNota(relativo, false) + 'm', raiz: relativo, menor: true },
            ];
            for (const c of candidatos) {
                let extra = 0;
                for (const ac of [primeiro, ultimo]) {
                    if (!ac) continue;
                    const acMenor = qualidade(ac.sufixo).startsWith('m') && qualidade(ac.sufixo) !== 'maj7';
                    if (ac.raiz === c.raiz && acMenor === c.menor) extra += 2.5;
                }
                if (pontos + extra > melhor.pontos) melhor = { pontos: pontos + extra, nome: c.nome };
            }
        }
        // Escreve com bemol se for um tom "de bemol" (ex.: Bb em vez de A#).
        return transporTom(melhor.nome, 0, 'auto');
    }

    // Formatos de acorde considerados fáceis (sem pestana) no violão.
    // AJUSTAR: adicione/remova formatos para mudar o critério da sugestão de capo.
    const FORMATOS_FACEIS = new Set([
        'C', 'C7', 'Cmaj7', 'Cadd9', 'C6', 'D', 'Dm', 'D7', 'Dm7', 'Dmaj7', 'Dsus2', 'Dsus4', 'D6',
        'E', 'Em', 'E7', 'Em7', 'Esus4', 'Emaj7', 'E6', 'Eadd9', 'G', 'G7', 'Gmaj7', 'G6', 'Gadd9',
        'A', 'Am', 'A7', 'Am7', 'Amaj7', 'Asus2', 'Asus4', 'A6', 'Am6', 'Fmaj7', 'B7', 'E5', 'A5', 'D5',
    ]);

    /*
     * Testa o capotraste da casa 0 até a 7 e dá uma "nota de dificuldade"
     * para cada um (quantos acordes com pestana sobram).
     * Recebe o texto e quanto já está transposto.
     * Devolve a lista ordenada da mais fácil: [{ capo, pestanas, acordes }].
     */
    function sugerirCapo(texto, semitons) {
        const contagem = contarAcordes(texto);
        const opcoes = [];
        for (let capo = 0; capo <= 7; capo++) {
            let pestanas = 0;
            const formatos = [];
            for (const [nome, vezes] of Object.entries(contagem)) {
                const a = analisarAcorde(nome);
                const forma = nomeNota(a.raiz + (semitons || 0) - capo, false) + qualidade(a.sufixo);
                if (!FORMATOS_FACEIS.has(forma)) pestanas += vezes;
                if (!formatos.includes(forma)) formatos.push(forma);
            }
            opcoes.push({ capo, pestanas, acordes: formatos });
        }
        // Menos pestanas primeiro; empate = capo mais baixo.
        return opcoes.sort((a, b) => a.pestanas - b.pestanas || a.capo - b.capo);
    }

    // =====================================================================
    // === 7. DIAGRAMAS ====================================================
    // =====================================================================
    // Posições do violão: lista de 6 casas, da 6ª corda (Mi grave) até a 1ª (Mi agudo).
    // null = corda abafada (x), 0 = corda solta (o).

    // Acordes abertos clássicos (os que não seguem um formato de pestana).
    // ONDE: para corrigir/adicionar o desenho de um acorde aberto, mexa aqui.
    const ABERTOS = {
        'C': [null, 3, 2, 0, 1, 0], 'C7': [null, 3, 2, 3, 1, 0], 'Cmaj7': [null, 3, 2, 0, 0, 0],
        'Cadd9': [null, 3, 2, 0, 3, 0], 'Csus4': [null, 3, 3, 0, 1, 1], 'Csus2': [null, 3, 0, 0, 1, 3],
        'C6': [null, 3, 2, 2, 1, 0],
        'D': [null, null, 0, 2, 3, 2], 'Dm': [null, null, 0, 2, 3, 1], 'D7': [null, null, 0, 2, 1, 2],
        'Dm7': [null, null, 0, 2, 1, 1], 'Dmaj7': [null, null, 0, 2, 2, 2], 'Dsus2': [null, null, 0, 2, 3, 0],
        'Dsus4': [null, null, 0, 2, 3, 3], 'D6': [null, null, 0, 2, 0, 2], 'D5': [null, null, 0, 2, 3, null],
        'Dadd9': [null, null, 0, 2, 3, 0],
        'G': [3, 2, 0, 0, 0, 3], 'G7': [3, 2, 0, 0, 0, 1], 'Gmaj7': [3, 2, 0, 0, 0, 2], 'G6': [3, 2, 0, 0, 0, 0],
        'Gsus4': [3, 3, 0, 0, 1, 3], 'Gadd9': [3, 0, 0, 2, 0, 3],
        'B7': [null, 2, 1, 2, 0, 2], 'Fmaj7': [null, null, 3, 2, 1, 0],
    };

    // Formatos de pestana, em casas RELATIVAS à casa da raiz.
    // Formato "E": raiz na 6ª corda (como o F). Formato "A": raiz na 5ª corda (como o Bm).
    const FORMATO_E = {
        '': [0, 2, 2, 1, 0, 0], 'm': [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], 'm7': [0, 2, 0, 0, 0, 0],
        'maj7': [0, null, 1, 1, 0, null], 'sus4': [0, 2, 2, 2, 0, 0], '6': [0, 2, 2, 1, 2, 0],
        'm6': [0, 2, 2, 0, 2, 0], '7sus4': [0, 2, 0, 2, 0, 0], '5': [0, 2, 2, null, null, null],
        'aug': [0, 3, 2, 1, 1, 0], 'dim': [0, 1, 2, 0, null, null], 'dim7': [0, 1, 2, 0, 2, 0],
        'm7b5': [0, null, 0, 0, -1, null], '9': [0, 2, 0, 1, 0, 2], 'add9': [0, 2, 2, 1, 0, 2],
    };
    const FORMATO_A = {
        '': [null, 0, 2, 2, 2, 0], 'm': [null, 0, 2, 2, 1, 0], '7': [null, 0, 2, 0, 2, 0], 'm7': [null, 0, 2, 0, 1, 0],
        'maj7': [null, 0, 2, 1, 2, 0], 'sus4': [null, 0, 2, 2, 3, 0], 'sus2': [null, 0, 2, 2, 0, 0],
        '6': [null, 0, 2, 2, 2, 2], 'm6': [null, 0, 2, 2, 1, 2], '9': [null, 0, -1, 0, 0, null],
        'add9': [null, 0, 2, 4, 2, 0], 'dim': [null, 0, 1, 2, 1, null], 'dim7': [null, 0, 1, -1, 1, null],
        'm7b5': [null, 0, 1, 0, 1, null], 'aug': [null, 0, 3, 2, 2, 1], '7sus4': [null, 0, 2, 0, 3, 0],
        '5': [null, 0, 2, 2, null, null],
    };
    const CORDAS_SOLTAS = [4, 9, 2, 7, 11, 4]; // E A D G B e

    /* Aplica um formato de pestana na casa "casaRaiz". Devolve as 6 casas ou null se impossível. */
    function aplicarFormato(formato, casaRaiz) {
        if (!formato) return null;
        const casas = formato.map(c => (c === null ? null : c + casaRaiz));
        return casas.some(c => c !== null && c < 0) ? null : casas;
    }

    /*
     * Descobre como tocar o acorde no violão.
     * Devolve { casas: [6 valores], baixoTexto: 'Baixo em F#' ou '' } ou null.
     */
    function posicaoViolao(texto) {
        const a = analisarAcorde(texto);
        if (!a) return null;
        const q = qualidade(a.sufixo);
        const nomeBase = nomeNota(a.raiz, false) + q;

        // 1º: acorde aberto conhecido. 2º: o formato de pestana que fica mais baixo no braço.
        let casas = ABERTOS[nomeBase] ? ABERTOS[nomeBase].slice() : null;
        if (!casas) {
            const casaE = (a.raiz - 4 + 12) % 12;
            const casaA = (a.raiz - 9 + 12) % 12;
            const candidatas = [
                aplicarFormato(FORMATO_E[q], casaE), aplicarFormato(FORMATO_A[q], casaA),
                aplicarFormato(FORMATO_E[q], casaE + 12), aplicarFormato(FORMATO_A[q], casaA + 12),
            ].filter(Boolean);
            if (!candidatas.length) return null;
            const maior = cs => Math.max(...cs.filter(c => c !== null));
            candidatas.sort((x, y) => maior(x) - maior(y));
            casas = candidatas[0];
        }

        // Baixo diferente (ex.: G/B): tenta colocar a nota do baixo na 6ª ou 5ª corda, perto da mão.
        let baixoTexto = '';
        if (a.baixo !== null && a.baixo !== a.raiz) {
            const tocadas = casas.filter(c => c !== null && c > 0);
            const min = tocadas.length ? Math.min(...tocadas) : 0;
            const max = tocadas.length ? Math.max(...tocadas) : 0;
            const cabe = f => f === 0 || (f >= min - 1 && f <= max + 1 && Math.max(max, f) - Math.min(min || f, f) <= 4);
            let colocou = false;
            for (const corda of [0, 1]) {
                for (let f = 0; f <= 15 && !colocou; f++) {
                    if ((CORDAS_SOLTAS[corda] + f) % 12 === a.baixo && cabe(f)) {
                        casas[corda] = f;
                        if (corda === 1) casas[0] = null;
                        colocou = true;
                    }
                }
                if (colocou) break;
            }
            if (!colocou) baixoTexto = 'Baixo em ' + nomeNota(a.baixo, a.bemol);
        }
        return { casas, baixoTexto };
    }

    /*
     * Desenha o diagrama do acorde no violão como SVG (texto).
     * Mostra 5 casas, pestana, cordas soltas (o) e abafadas (x).
     */
    function svgViolao(texto) {
        const pos = posicaoViolao(texto);
        if (!pos) return '<div class="diagrama-vazio">Sem diagrama</div>';
        const casas = pos.casas;

        // AJUSTAR: tamanho do desenho.
        const L = 92, A = 112, X0 = 18, Y0 = 22, DX = (L - 24) / 5, DY = 17;

        const tocadas = casas.filter(c => c !== null && c > 0);
        const max = tocadas.length ? Math.max(...tocadas) : 0;
        const min = tocadas.length ? Math.min(...tocadas) : 0;
        const inicio = max <= 4 ? 1 : min; // casa do topo do desenho

        let s = '<svg class="diagrama" viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="Diagrama de ' + esc(texto) + '">';
        // Trastes (linhas horizontais) e cordas (verticais).
        for (let i = 0; i <= 5; i++) {
            const y = Y0 + i * DY;
            s += '<line x1="' + X0 + '" y1="' + y + '" x2="' + (X0 + 5 * DX) + '" y2="' + y + '" class="d-traste' + (i === 0 && inicio === 1 ? ' d-pestana-fixa' : '') + '"/>';
        }
        for (let c = 0; c < 6; c++) {
            const x = X0 + c * DX;
            s += '<line x1="' + x + '" y1="' + Y0 + '" x2="' + x + '" y2="' + (Y0 + 5 * DY) + '" class="d-corda"/>';
        }
        if (inicio > 1) s += '<text x="' + (X0 - 5) + '" y="' + (Y0 + DY * 0.7) + '" class="d-casa" text-anchor="end">' + inicio + '</text>';

        // Pestana: a menor casa aparece em várias cordas, da mais grave tocada até a 1ª.
        const primeira = casas.findIndex(c => c !== null);
        let pestana = null;
        if (min > 0 && casas[5] === min && casas[primeira] === min && casas.slice(primeira).every(c => c !== null && c >= min)) {
            pestana = { casa: min, de: primeira };
            const y = Y0 + (min - inicio + 0.5) * DY;
            s += '<rect x="' + (X0 + primeira * DX - 5) + '" y="' + (y - 5) + '" width="' + ((5 - primeira) * DX + 10) + '" height="10" rx="5" class="d-dedo"/>';
        }

        casas.forEach((c, corda) => {
            const x = X0 + corda * DX;
            if (c === null) s += '<text x="' + x + '" y="' + (Y0 - 7) + '" class="d-marca" text-anchor="middle">×</text>';
            else if (c === 0) s += '<circle cx="' + x + '" cy="' + (Y0 - 10) + '" r="3.5" class="d-solta"/>';
            else if (!(pestana && c === pestana.casa)) {
                s += '<circle cx="' + x + '" cy="' + (Y0 + (c - inicio + 0.5) * DY) + '" r="5.6" class="d-dedo"/>';
            }
        });
        s += '</svg>';
        if (pos.baixoTexto) s += '<div class="diagrama-obs">' + esc(pos.baixoTexto) + '</div>';
        return s;
    }

    /* Desenha um teclado de 2 oitavas com as notas do acorde destacadas (SVG em texto). */
    function svgTeclado(texto) {
        const a = analisarAcorde(texto);
        if (!a) return '<div class="diagrama-vazio">Sem diagrama</div>';
        const ints = INTERVALOS[qualidade(a.sufixo)];
        const temBaixo = a.baixo !== null && a.baixo !== a.raiz;

        // Com baixo separado, o baixo fica na 1ª oitava e o acorde sobe uma oitava.
        const acesas = new Set();
        const base = temBaixo ? a.raiz + 12 : a.raiz;
        ints.forEach(i => { let n = base + i; while (n > 23) n -= 12; acesas.add(n); });
        const baixo = temBaixo ? a.baixo : -1;

        const BRANCAS = [0, 2, 4, 5, 7, 9, 11];
        const W = 11, H = 46;
        let brancas = '', pretas = '';
        for (let oit = 0; oit < 2; oit++) {
            BRANCAS.forEach((nota, i) => {
                const n = nota + oit * 12;
                const x = (oit * 7 + i) * W;
                const cls = n === baixo ? 'k-baixo' : (acesas.has(n) ? 'k-acesa' : 'k-branca');
                brancas += '<rect x="' + x + '" y="0" width="' + W + '" height="' + H + '" class="' + cls + '"/>';
            });
            [1, 3, 6, 8, 10].forEach(nota => {
                const n = nota + oit * 12;
                const posBranca = BRANCAS.indexOf(nota - 1);
                const x = (oit * 7 + posBranca + 1) * W - 3.5;
                const cls = n === baixo ? 'k-baixo' : (acesas.has(n) ? 'k-acesa' : 'k-preta');
                pretas += '<rect x="' + x + '" y="0" width="7" height="28" class="' + cls + '"/>';
            });
        }
        return '<svg class="diagrama diagrama-teclado" viewBox="-1 -1 ' + (14 * W + 2) + ' ' + (H + 2) + '" role="img" aria-label="Teclado ' + esc(texto) + '">' + brancas + pretas + '</svg>';
    }

    // =====================================================================
    // === 8. CHORDPRO =====================================================
    // =====================================================================

    /*
     * Converte o formato ChordPro (acordes dentro da letra: "[C]Hoje [G]eu vou")
     * para o formato tradicional (acordes numa linha acima da letra).
     * Também lê diretivas {title:}, {artist:}, {key:} e {soc}/{c:}.
     * Devolve { texto, titulo, artista, tom }.
     */
    function chordProParaCifra(entrada) {
        const meta = { titulo: '', artista: '', tom: '' };
        const saida = [];
        for (const linha of normalizarTexto(entrada).split('\n')) {
            const dir = /^\s*\{\s*(\w+)\s*:?\s*(.*?)\s*\}\s*$/.exec(linha);
            if (dir) {
                const nome = dir[1].toLowerCase();
                if (nome === 'title' || nome === 't') meta.titulo = dir[2];
                else if (nome === 'artist' || nome === 'subtitle' || nome === 'st') meta.artista = dir[2];
                else if (nome === 'key') meta.tom = dir[2];
                else if (nome === 'soc' || nome === 'start_of_chorus') saida.push('[Refrão]');
                else if (nome === 'sov' || nome === 'start_of_verse') saida.push('[Verso]');
                else if (nome === 'sot' || nome === 'start_of_tab') saida.push('[Tab]');
                else if ((nome === 'c' || nome === 'comment') && dir[2]) saida.push('[' + dir[2] + ']');
                continue;
            }

            // Só converte se tiver [acorde] dentro da linha.
            if (!/\[[^\]]+\]/.test(linha) || !Array.from(linha.matchAll(/\[([^\]]+)\]/g)).some(m => ehAcorde(m[1]))) {
                saida.push(linha);
                continue;
            }
            let acordes = '', letra = '';
            const re = /\[([^\]]+)\]/g;
            let ultimo = 0, m;
            while ((m = re.exec(linha)) !== null) {
                letra += linha.slice(ultimo, m.index);
                ultimo = m.index + m[0].length;
                if (!ehAcorde(m[1])) { letra += m[0]; continue; }
                // O acorde vai na coluna atual da letra; se colar no anterior, ganha um espaço.
                let coluna = letra.length;
                if (acordes.length && coluna <= acordes.length) {
                    coluna = acordes.length + 1;
                    letra += ' '.repeat(coluna - letra.length);
                }
                acordes += ' '.repeat(coluna - acordes.length) + m[1];
            }
            letra += linha.slice(ultimo);
            saida.push(acordes.replace(/\s+$/, ''));
            if (letra.trim()) saida.push(letra.replace(/\s+$/, ''));
        }
        return Object.assign(meta, { texto: saida.join('\n') });
    }

    // ---------------------------------------------------------------------
    // Exporta tudo em window.CifraMotor (e em module.exports para testes no Node).
    // ---------------------------------------------------------------------
    const CifraMotor = {
        SUSTENIDOS, BEMOIS, indiceNota, nomeNota,
        analisarAcorde, ehAcorde, qualidade, notasDoAcorde,
        tipoLinha, ehLinhaTab,
        tomUsaBemol, transporTom, transporAcorde, simplificarAcorde,
        renderizarCifra, renderizarLetra, renderizarTabs, transporTexto, normalizarTexto,
        listarAcordes, contarAcordes, detectarTom, sugerirCapo,
        posicaoViolao, svgViolao, svgTeclado, chordProParaCifra,
    };
    global.CifraMotor = CifraMotor;
    if (typeof module !== 'undefined' && module.exports) module.exports = CifraMotor;
})(typeof window !== 'undefined' ? window : globalThis);
