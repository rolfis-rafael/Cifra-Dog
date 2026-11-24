/*
 * filtro-json.js — Filtro de segurança para tudo que entra no Cifra-Dog por JSON.
 * ---------------------------------------------------------------------------
 * PARA QUE SERVE
 *   O Cifra-Dog não tem servidor nem banco: repertórios, backups e pacotes de músicas
 *   chegam como arquivos JSON (de amigos, da internet, do Drive). Um JSON mal-intencionado
 *   poderia tentar: (1) injetar HTML/script no texto de uma cifra; (2) mexer nas "entranhas"
 *   do objeto (__proto__, constructor); (3) trocar configurações do app (ex.: endereço do
 *   catálogo de pacotes); (4) travar o aparelho com um arquivo gigante.
 *
 *   Este filtro reconstrói o JSON do zero: só copia os campos que o app conhece, com o tipo
 *   certo e com limites de tamanho. O que sobrar (campo desconhecido, texto com <script>,
 *   número absurdo, link que não é http/https) é descartado ou limpo e CONTADO, para o app
 *   poder avisar a pessoa ("3 itens suspeitos foram removidos").
 *
 *   Importante: este filtro é a 1ª camada. A 2ª é o app escapar todo texto na hora de
 *   desenhar (UI.esc). As duas juntas é que dão a segurança.
 *
 * COMO USAR
 *   FiltroJson.backup(dados)   -> { dados, removidos, alterados }  (backup completo / repertório exportado)
 *   FiltroJson.pacote(pacote)  -> cópia limpa de um pacote de músicas (antes do validarPacote)
 *   FiltroJson.lerArquivo(f)   -> lê um File (.json) com limite de tamanho e devolve o objeto
 *   FiltroJson.zerarRelatorio() / FiltroJson.resumo()  -> contagem para avisar a pessoa
 *
 * Não depende de nenhum outro arquivo (usa CifraMotor e DB só se já existirem).
 */
(function (global) {
    'use strict';

    /* =====================================================================
       1. LIMITES (AJUSTAR aqui se algum dia precisar de mais)
       ===================================================================== */
    const LIM = {
        bytesArquivo: 20 * 1024 * 1024,   // tamanho máximo de um arquivo .json
        musicas: 5000, repertorios: 500, ordens: 20, itens: 3000,
        titulo: 100, artista: 100, nomeRep: 80, nomeOrdem: 60, nomeBloco: 60, descricao: 300,
        cifra: 60000, notas: 20000, lembrete: 300, curto: 80, url: 500, obsCompasso: 200,
        textoGenerico: 2000,              // texto dentro de campos estruturados (marcadores, programa...)
        // profundidade: um pacote tem musicas > secoes > linhas > linha (chega ao nível 6); 10 dá folga e ainda barra aninhamento absurdo.
        profundidade: 10, itensLista: 5000, chavesObjeto: 300,
        exclusoes: 20000,
    };

    /* =====================================================================
       2. REGRAS DE TEXTO
       ===================================================================== */
    const PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
    const RE_CHAVE = /^[\w.:+\- ]{1,60}$/;          // nomes de campo aceitos em estruturas livres (ex.: "m:cc:64")
    const RE_ID = /^[\w.:\-]{1,80}$/;               // ids de música, repertório, ordem e item
    const RE_COMPASSO = /^\d{1,2}\/\d{1,2}$/;
    const RE_YOUTUBE = /^[\w-]{6,20}$/;
    // Caracteres de controle e os que "viram o texto ao contrário" (usados para enganar o olho).
    const RE_CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩﻿]/g;
    // Tags HTML perigosas (script, iframe, svg, img...) e qualquer tag com atributo on...= (onclick, onerror...).
    const TAGS = '(?:script|iframe|frame|frameset|object|embed|applet|style|link|meta|base|form|input|button|textarea|select|svg|math|img|image|video|audio|source|track|canvas|body|html|head|title|template|noscript|portal)';
    const RE_TAG_PERIGO_G = new RegExp('<\\/?\\s*' + TAGS + '\\b[^>]*>?', 'gi');
    const RE_TAG_EVENTO_G = /<[^>]*\bon[a-z]+\s*=[^>]*>?/gi;
    const RE_TAG_PERIGO = new RegExp(RE_TAG_PERIGO_G.source, 'i');
    const RE_TAG_EVENTO = new RegExp(RE_TAG_EVENTO_G.source, 'i');
    const RE_CTRL_TESTE = new RegExp(RE_CTRL.source);

    /* Relatório acumulado (o filtro roda em mais de um ponto do mesmo fluxo; somar evita contar errado). */
    const relatorio = { removidos: 0, alterados: 0 };
    function zerarRelatorio() { relatorio.removidos = 0; relatorio.alterados = 0; }
    function resumo() {
        const n = relatorio.removidos + relatorio.alterados;
        return n ? ' · filtro de segurança: ' + n + (n > 1 ? ' itens suspeitos limpos' : ' item suspeito limpo') : '';
    }
    const novoSt = () => ({ removidos: 0, alterados: 0 });
    function somar(st) { relatorio.removidos += st.removidos; relatorio.alterados += st.alterados; }

    const eObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    function novoId() {
        if (global.DB && typeof global.DB.novoId === 'function') return global.DB.novoId();
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /** Texto: tira controles e tags perigosas, limita o tamanho. multi = aceita várias linhas (cifra, notas). */
    function texto(v, max, st, multi) {
        if (typeof v === 'number' && isFinite(v)) v = String(v);
        if (typeof v !== 'string') { if (v != null) st.alterados++; return ''; }
        let t = v;
        const perigo = RE_CTRL_TESTE.test(t) || RE_TAG_PERIGO.test(t) || RE_TAG_EVENTO.test(t);
        if (perigo) {
            t = t.replace(RE_CTRL, '').replace(RE_TAG_EVENTO_G, '').replace(RE_TAG_PERIGO_G, '');
            st.alterados++;
        }
        if (!multi) t = t.replace(/[\r\n\t]+/g, ' ');
        if (t.length > max) { t = t.slice(0, max); st.alterados++; }
        return multi ? t : t.trim();
    }

    /** Número dentro de um intervalo. Se não for número de verdade, usa o padrão. */
    function numero(v, min, max, padrao, st, inteiro = true) {
        let n = v;
        if (typeof n === 'string' && n.trim() !== '') n = Number(n);
        if (typeof n !== 'number' || !isFinite(n)) { if (v != null && v !== '') st.alterados++; return padrao; }
        if (inteiro) n = Math.round(n);
        const c = Math.min(max, Math.max(min, n));
        if (c !== n) st.alterados++;
        return c;
    }
    const DATA_MAX = 4102444800000;   // 01/01/2100
    const data = (v, st) => numero(v, 0, DATA_MAX, 0, st);

    /** Só aceita link http(s). "javascript:", "data:" etc. viram vazio. */
    function url(v, st) {
        if (typeof v !== 'string' || !v.trim()) return '';
        if (v.length > LIM.url) { st.alterados++; return ''; }
        try {
            const x = new URL(v.trim());
            if (/^https?:$/.test(x.protocol)) return x.href;
        } catch (e) { /* cai no descarte */ }
        st.alterados++;
        return '';
    }

    function idValido(v) { return typeof v === 'string' && RE_ID.test(v) ? v : ''; }

    /* Tom: usa o validador do app se já estiver carregado; senão, uma regra simples. */
    function tomValido(v, st) {
        const t = texto(v, 12, st);
        if (!t) return '';
        const ok = global.CifraMotor && typeof global.CifraMotor.ehAcorde === 'function'
            ? global.CifraMotor.ehAcorde(t) : /^[A-Ga-g][#b♯♭]?[\w#♯♭+()/\-]{0,10}$/.test(t);
        if (!ok) { st.alterados++; return ''; }
        return t;
    }

    /**
     * Limpeza genérica para campos de formato livre (marcadores, programa da rolagem, mapa do pedal...).
     * Mantém só texto, número, verdadeiro/falso, listas e objetos simples, com profundidade e tamanho limitados.
     */
    function generico(v, prof, st, maxTexto) {
        if (v === null) return null;
        if (typeof v === 'string') return texto(v, maxTexto || LIM.textoGenerico, st, true);
        if (typeof v === 'number') return isFinite(v) ? Math.min(1e9, Math.max(-1e9, v)) : 0;
        if (typeof v === 'boolean') return v;
        if (prof >= LIM.profundidade) { st.removidos++; return null; }
        if (Array.isArray(v)) {
            if (v.length > LIM.itensLista) st.removidos++;
            return v.slice(0, LIM.itensLista).map(x => generico(x, prof + 1, st, maxTexto));
        }
        if (eObjeto(v)) {
            const o = {};
            let n = 0;
            for (const k of Object.keys(v)) {
                if (PROIBIDAS.has(k) || !RE_CHAVE.test(k) || ++n > LIM.chavesObjeto) { st.removidos++; continue; }
                o[k] = generico(v[k], prof + 1, st, maxTexto);
            }
            return o;
        }
        st.removidos++;   // função, undefined, símbolo...
        return null;
    }

    /* =====================================================================
       3. MÚSICA, ITEM, REPERTÓRIO
       ===================================================================== */

    // Campos que o app conhece numa música. AJUSTAR: se criar um campo novo, inclua aqui e em musica().
    const CAMPOS_MUSICA = new Set(['id', 'titulo', 'artista', 'tom', 'capo', 'bpm', 'compasso', 'cifra', 'curtida', 'semitons',
        'tocadas', 'criadaEm', 'abertaEm', 'atualizadaEm', 'compassosPorFrase', 'fonte', 'genero', 'notas', 'etapa', 'afinacao',
        'lembrete', 'obsCompasso', 'youtube', 'duracaoMin', 'numeroLista', 'rolagemBpm', 'rolagemProg', 'marcadores', 'programa',
        'extensao', 'pacote', 'licenca', 'exemplo']);

    function musica(m, st) {
        if (!eObjeto(m)) { st.removidos++; return null; }
        const o = {};
        o.id = idValido(m.id);
        o.titulo = texto(m.titulo, LIM.titulo, st) || 'Sem título';
        o.artista = texto(m.artista, LIM.artista, st);
        o.tom = tomValido(m.tom, st);
        o.capo = numero(m.capo, 0, 12, 0, st);
        o.bpm = numero(m.bpm, 0, 300, 0, st);
        const comp = texto(m.compasso, 8, st);
        o.compasso = RE_COMPASSO.test(comp) ? comp : '4/4';
        o.cifra = texto(m.cifra, LIM.cifra, st, true);
        o.curtida = m.curtida === true;
        o.semitons = numero(m.semitons, -12, 12, 0, st);
        o.tocadas = numero(m.tocadas, 0, 1e7, 0, st);
        o.criadaEm = data(m.criadaEm, st);
        o.abertaEm = data(m.abertaEm, st);
        o.atualizadaEm = data(m.atualizadaEm, st);
        o.compassosPorFrase = eObjeto(m.compassosPorFrase) ? generico(m.compassosPorFrase, 1, st) : {};

        // Opcionais: só entram se existiam no arquivo (mesmo vazios, para o backup voltar idêntico).
        const opc = (k, v) => { if (m[k] !== undefined && m[k] !== null) o[k] = v; };
        opc('fonte', url(m.fonte, st));
        opc('genero', texto(m.genero, LIM.curto, st));
        opc('notas', texto(m.notas, LIM.notas, st, true));
        opc('etapa', texto(m.etapa, 20, st));
        opc('afinacao', texto(m.afinacao, LIM.curto, st));
        opc('lembrete', texto(m.lembrete, LIM.lembrete, st));
        opc('obsCompasso', texto(m.obsCompasso, LIM.obsCompasso, st));
        if (m.youtube != null && m.youtube !== '') {
            const y = texto(m.youtube, 20, st);
            if (RE_YOUTUBE.test(y)) o.youtube = y; else st.alterados++;
        }
        if (m.duracaoMin != null) o.duracaoMin = numero(m.duracaoMin, 0, 120, 0, st);
        if (m.numeroLista != null) o.numeroLista = numero(m.numeroLista, 0, 100000, 0, st);
        if (m.rolagemBpm != null) o.rolagemBpm = m.rolagemBpm === true;
        if (m.rolagemProg != null) o.rolagemProg = m.rolagemProg === true;
        if (m.exemplo != null) o.exemplo = m.exemplo === true;      // música de exemplo semeada pelo app

        // Campos estruturados (formato livre): limpeza genérica.
        for (const k of ['marcadores', 'programa', 'extensao', 'pacote']) {
            if (m[k] != null) o[k] = generico(m[k], 1, st);
        }
        if (eObjeto(m.licenca)) {
            const l = generico(m.licenca, 1, st, 300);
            if ('url' in l) { const u = url(l.url, st); if (u) l.url = u; else delete l.url; }
            o.licenca = l;
        }
        // Qualquer outro campo é desconhecido: descartado (e contado).
        for (const k of Object.keys(m)) if (!CAMPOS_MUSICA.has(k)) st.removidos++;
        return o;
    }

    function item(i, mapaIds, st) {
        if (!eObjeto(i)) { st.removidos++; return null; }
        const id = idValido(i.id) || novoId();
        if (i.tipo === 'bloco') return { id, tipo: 'bloco', nome: texto(i.nome, LIM.nomeBloco, st) || 'Bloco' };
        if (i.tipo === 'musica') {
            const alvo = typeof i.musicaId === 'string' ? (mapaIds.get(i.musicaId) || '') : '';
            if (!alvo) { st.removidos++; return null; }          // aponta para música que não veio no arquivo
            return { id, tipo: 'musica', musicaId: alvo, semitons: numero(i.semitons, -12, 12, 0, st) };
        }
        st.removidos++;
        return null;
    }
    const itens = (lista, mapaIds, st) =>
        (Array.isArray(lista) ? lista : []).slice(0, LIM.itens).map(i => item(i, mapaIds, st)).filter(Boolean);

    function repertorio(r, mapaIds, st) {
        if (!eObjeto(r)) { st.removidos++; return null; }
        const o = {
            id: idValido(r.id) || novoId(),
            nome: texto(r.nome, LIM.nomeRep, st) || 'Repertório',
            descricao: texto(r.descricao, LIM.descricao, st),
            criadoEm: data(r.criadoEm, st), abertoEm: data(r.abertoEm, st), atualizadaEm: data(r.atualizadaEm, st),
        };
        if (Array.isArray(r.ordens) && r.ordens.length) {
            const usados = new Set();
            o.ordens = r.ordens.slice(0, LIM.ordens).filter(eObjeto).map(ord => {
                let id = idValido(ord.id); if (!id || usados.has(id)) id = novoId(); usados.add(id);
                return { id, nome: texto(ord.nome, LIM.nomeOrdem, st) || 'Ordem', itens: itens(ord.itens, mapaIds, st) };
            });
            const ativa = idValido(r.ativa);
            o.ativa = o.ordens.some(x => x.id === ativa) ? ativa : o.ordens[0].id;
            o.itens = o.ordens.find(x => x.id === o.ativa).itens;
        } else {
            o.itens = itens(r.itens, mapaIds, st);
        }
        return o;
    }

    /* =====================================================================
       4. BACKUP COMPLETO
       ===================================================================== */

    // AJUSTAR: configurações que um backup pode restaurar. "pacotesUrl" fica DE FORA de propósito:
    // um arquivo recebido não pode trocar o endereço de onde o app baixa pacotes.
    const AJUSTES_OK = ['baterista', 'bemol', 'botaoAcao', 'canhoto', 'cardapio', 'cliqueBpm', 'duasColunas', 'fonte', 'simplificar', 'velocidade', 'voz'];
    // AJUSTAR: marcas internas ("já semeei os exemplos") que um backup pode gravar.
    const META_OK = ['semeado', 'lista-video-v1', 'exemplos-iniciais-v1'];

    function backup(dados) {
        const st = novoSt();
        if (!eObjeto(dados) || !Array.isArray(dados.musicas)) throw new Error('Arquivo de backup inválido.');
        if (dados.musicas.length > LIM.musicas) throw new Error('Backup com cifras demais (limite ' + LIM.musicas + ').');
        const reps = Array.isArray(dados.repertorios) ? dados.repertorios : [];
        if (reps.length > LIM.repertorios) throw new Error('Backup com repertórios demais (limite ' + LIM.repertorios + ').');

        // Músicas (ids repetidos ou inválidos são resolvidos; mapaIds liga o id do arquivo ao id final).
        const mapaIds = new Map(), vistos = new Set(), musicas = [];
        for (const bruta of dados.musicas) {
            const m = musica(bruta, st);
            if (!m) continue;
            const original = eObjeto(bruta) && typeof bruta.id === 'string' ? bruta.id : '';
            if (m.id && vistos.has(m.id)) { st.removidos++; continue; }            // mesmo id duas vezes
            if (!m.id) { m.id = novoId(); st.alterados++; }
            vistos.add(m.id);
            if (original) mapaIds.set(original, m.id);
            musicas.push(m);
        }
        const repertorios = reps.map(r => repertorio(r, mapaIds, st)).filter(Boolean);

        const out = {
            app: texto(dados.app, 40, st) || 'Cifra-Dog',
            versao: numero(dados.versao, 0, 100, 3, st),
            exportadoEm: texto(dados.exportadoEm, 40, st),
            musicas, repertorios, meta: {},
        };
        if (dados.formatoSala != null) out.formatoSala = numero(dados.formatoSala, 0, 100, 1, st);

        if (eObjeto(dados.meta)) for (const k of META_OK) if (dados.meta[k] === true) out.meta[k] = true;

        if (eObjeto(dados.exclusoes)) {
            out.exclusoes = {};
            let n = 0;
            for (const k of Object.keys(dados.exclusoes)) {
                const v = dados.exclusoes[k];
                if (PROIBIDAS.has(k) || !/^(rep:)?[\w.:\-]{1,80}$/.test(k) || typeof v !== 'number' || !isFinite(v) || ++n > LIM.exclusoes) { st.removidos++; continue; }
                out.exclusoes[k] = Math.min(DATA_MAX, Math.max(0, v));
            }
        }
        if (eObjeto(dados.ajustes)) {
            out.ajustes = {};
            for (const k of Object.keys(dados.ajustes)) {
                if (!AJUSTES_OK.includes(k)) { st.removidos++; continue; }
                out.ajustes[k] = generico(dados.ajustes[k], 1, st, 300);
            }
        }
        if (eObjeto(dados.pedal)) out.pedal = generico(dados.pedal, 0, st, 100);
        if (eObjeto(dados.perfis)) out.perfis = generico(dados.perfis, 0, st, 100);

        // Campos de primeiro nível que o app não conhece.
        for (const k of Object.keys(dados)) if (!(k in out)) st.removidos++;

        somar(st);
        return { dados: out, removidos: st.removidos, alterados: st.alterados };
    }

    /* =====================================================================
       5. PACOTE DE MÚSICAS (formato cifradog.pacote — ver pacotes.js)
       ===================================================================== */
    function pacote(p) {
        if (!eObjeto(p)) return p;          // o validarPacote reclama com mensagem amigável
        const st = novoSt();
        const limpo = generico(p, 0, st, 1000);
        somar(st);
        return limpo;
    }

    /* =====================================================================
       6. LER ARQUIVO .json COM LIMITE DE TAMANHO
       ===================================================================== */
    async function lerArquivo(f) {
        if (!f) throw new Error('Nenhum arquivo escolhido.');
        if (f.size > LIM.bytesArquivo) throw new Error('Arquivo grande demais (limite de ' + Math.round(LIM.bytesArquivo / 1048576) + ' MB).');
        let texto;
        try { texto = await f.text(); } catch (e) { throw new Error('Não consegui ler o arquivo.'); }
        try { return JSON.parse(texto); } catch (e) { throw new Error('O arquivo não é um JSON válido.'); }
    }

    global.FiltroJson = { LIM, backup, pacote, lerArquivo, zerarRelatorio, resumo, relatorio, generico, url };
})(typeof window !== 'undefined' ? window : globalThis);
