/*
 * db.js — Banco de dados local do Cifra-Dog (substitui o MySQL + PHP).
 *
 * Usa o IndexedDB, que é um banco que vem dentro do navegador:
 *   - funciona offline;
 *   - os dados ficam só neste aparelho (use Exportar/Importar backup para levar a outro).
 *
 * Tabelas ("stores"), baseadas no banco.sql antigo:
 *   musicas     { id, titulo, artista, tom, capo, bpm, compasso, cifra, curtida,
 *                 semitons, tocadas, criadaEm, atualizadaEm, abertaEm,
 *                 compassosPorFrase }   <- reservado para a rolagem por BPM
 *   repertorios { id, nome, descricao, criadoEm, abertoEm,
 *                 itens: [ {id, tipo:'musica', musicaId, semitons}
 *                        | {id, tipo:'bloco', nome} ] }   <- 'bloco' reservado para a divisão em blocos
 */
(function (global) {
    'use strict';

    const NOME_BANCO = 'cifradog';
    const VERSAO = 1;
    let conexao = null;

    /* Abre (ou cria) o banco. Guarda a conexão para reaproveitar. */
    function abrir() {
        if (conexao) return Promise.resolve(conexao);
        return new Promise((ok, erro) => {
            const req = indexedDB.open(NOME_BANCO, VERSAO);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('musicas')) db.createObjectStore('musicas', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('repertorios')) db.createObjectStore('repertorios', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'chave' });
            };
            req.onsuccess = () => { conexao = req.result; ok(conexao); };
            req.onerror = () => erro(req.error);
        });
    }

    /* Executa uma operação numa store e devolve uma Promise com o resultado. */
    async function operar(store, modo, fn) {
        const db = await abrir();
        return new Promise((ok, erro) => {
            const tx = db.transaction(store, modo);
            const req = fn(tx.objectStore(store));
            tx.oncomplete = () => ok(req ? req.result : undefined);
            tx.onerror = () => erro(tx.error);
        });
    }

    /* Gera um id curto e único. */
    function novoId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function completarMusica(m) {
        const agora = Date.now();
        return Object.assign({
            id: novoId(), titulo: 'Sem título', artista: '', tom: '', capo: 0,
            bpm: 0, compasso: '4/4', cifra: '', curtida: false, semitons: 0,
            tocadas: 0, criadaEm: agora, abertaEm: 0, compassosPorFrase: {},
        }, m, { atualizadaEm: agora });
    }

    /*
     * Um repertório pode ter VÁRIAS ORDENS (Ordem 1, Ordem 2...). Cada ordem tem a sua lista de itens.
     * r.itens é sempre um "espelho" da ordem ativa, então o resto do app continua usando r.itens.
     */
    function normalizarRep(r) {
        if (!r) return r;
        if (!Array.isArray(r.itens)) r.itens = [];
        if (!Array.isArray(r.ordens) || !r.ordens.length) {
            r.ordens = [{ id: novoId(), nome: 'Ordem 1', itens: r.itens }];
            r.ativa = r.ordens[0].id;
        }
        let at = r.ordens.find(o => o.id === r.ativa);
        if (!at) { at = r.ordens[0]; r.ativa = at.id; }
        r.itens = at.itens;
        return r;
    }

    const DB = {
        novoId, normalizarRep,

        // ---------- Músicas ----------
        listarMusicas: () => operar('musicas', 'readonly', s => s.getAll()),
        pegarMusica: (id) => operar('musicas', 'readonly', s => s.get(id)),
        async salvarMusica(m) {
            const completa = completarMusica(m);
            await operar('musicas', 'readwrite', s => s.put(completa));
            return completa;
        },
        async adicionarExemplosSeVazio(exemplos) {
            const db = await abrir();
            return new Promise((ok, erro) => {
                const tx = db.transaction(['musicas', 'meta'], 'readwrite');
                const musicas = tx.objectStore('musicas'), meta = tx.objectStore('meta');
                const chave = 'exemplos-iniciais-v1';
                const marca = meta.get(chave);
                marca.onsuccess = () => {
                    if (marca.result) return;
                    const total = musicas.count();
                    total.onsuccess = () => {
                        if (total.result === 0) {
                            for (const exemplo of exemplos) musicas.add(completarMusica(exemplo));
                        }
                        meta.put({ chave, valor: true });
                    };
                };
                tx.oncomplete = () => ok();
                tx.onabort = () => erro(tx.error);
            });
        },
        async excluirMusica(id) {
            await operar('musicas', 'readwrite', s => s.delete(id));
            // Tira a música de todos os repertórios (em todas as ordens).
            const reps = await DB.listarRepertorios();
            for (const r of reps) {
                let mudou = false;
                for (const o of r.ordens) {
                    const antes = o.itens.length;
                    o.itens = o.itens.filter(i => i.musicaId !== id);
                    if (o.itens.length !== antes) mudou = true;
                }
                if (mudou) { r.itens = r.ordens.find(o => o.id === r.ativa).itens; await DB.salvarRepertorio(r); }
            }
        },
        /* Atualiza só alguns campos, sem mexer em atualizadaEm (ex.: abertaEm, curtida). */
        async atualizarMusica(id, campos) {
            const m = await DB.pegarMusica(id);
            if (!m) return null;
            Object.assign(m, campos);
            await operar('musicas', 'readwrite', s => s.put(m));
            return m;
        },

        // ---------- Repertórios ----------
        listarRepertorios: async () => (await operar('repertorios', 'readonly', s => s.getAll())).map(normalizarRep),
        pegarRepertorio: async (id) => normalizarRep(await operar('repertorios', 'readonly', s => s.get(id))),
        async salvarRepertorio(r) {
            const completo = Object.assign({ id: novoId(), nome: 'Novo repertório', descricao: '', criadoEm: Date.now(), abertoEm: 0, itens: [] }, r);
            // Garante que a ordem ativa guarda a lista atual (r.itens pode ter sido recriada pela tela).
            const at = completo.ordens && completo.ordens.find(o => o.id === completo.ativa);
            if (at) at.itens = completo.itens; else normalizarRep(completo);
            await operar('repertorios', 'readwrite', s => s.put(completo));
            return completo;
        },
        excluirRepertorio: (id) => operar('repertorios', 'readwrite', s => s.delete(id)),

        // ---------- Meta (configurações internas) ----------
        async lerMeta(chave) { const r = await operar('meta', 'readonly', s => s.get(chave)); return r ? r.valor : undefined; },
        gravarMeta: (chave, valor) => operar('meta', 'readwrite', s => s.put({ chave, valor })),

        // ---------- Backup ----------
        async exportar() {
            const meta = {};
            for (const k of ['semeado', 'lista-video-v1']) if (await DB.lerMeta(k)) meta[k] = true;
            return {
                app: 'Cifra-Dog', versao: 3, exportadoEm: new Date().toISOString(),
                musicas: await DB.listarMusicas(),
                repertorios: await DB.listarRepertorios(),
                meta,
            };
        },
        /*
         * Importa um backup JUNTANDO com o que já existe neste aparelho (não duplica):
         *   - música igual (mesmo id OU mesmo título + artista) -> uma só; vale o backup, exceto se o backup
         *     trouxer a cifra vazia (não apaga cifra já colada) ou se a cópia daqui for mais nova;
         *   - repertório com o mesmo nome -> o do backup substitui (mantendo os ids das músicas daqui).
         */
        async importar(dados) {
            if (!dados || !Array.isArray(dados.musicas)) throw new Error('Arquivo de backup inválido.');
            dados = FiltroJson.backup(dados).dados;   // filtro de segurança (js/filtro-json.js): só passa o que o app conhece
            const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const chaveDe = (m) => norm(m.titulo) + '|' + norm(m.artista);
            const locais = await DB.listarMusicas();
            const porId = new Map(locais.map(m => [m.id, m]));
            const porChave = new Map(locais.map(m => [chaveDe(m), m]));
            const remap = new Map(); // id no backup -> id que vale neste aparelho
            let novas = 0, atualizadas = 0;
            for (const m of dados.musicas) {
                const ex = porId.get(m.id) || porChave.get(chaveDe(m));
                if (!ex) {
                    await operar('musicas', 'readwrite', s => s.put(m));
                    porId.set(m.id, m); porChave.set(chaveDe(m), m); remap.set(m.id, m.id); novas++;
                    continue;
                }
                remap.set(m.id, ex.id);
                const cifraBackup = (m.cifra || '').trim(), cifraLocal = (ex.cifra || '').trim();
                const manterLocal = (!cifraBackup && cifraLocal) || (cifraBackup && cifraLocal && (ex.atualizadaEm || 0) > (m.atualizadaEm || 0));
                if (manterLocal) continue;
                await operar('musicas', 'readwrite', s => s.put(Object.assign({}, m, { id: ex.id })));
                atualizadas++;
            }
            const reps = await DB.listarRepertorios();
            const repPorNome = new Map(reps.map(r => [norm(r.nome), r]));
            let nReps = 0;
            for (const r0 of (dados.repertorios || [])) {
                const r = normalizarRep(JSON.parse(JSON.stringify(r0)));
                for (const o of r.ordens) {
                    o.itens = o.itens
                        .filter(i => i.tipo === 'bloco' || remap.has(i.musicaId))
                        .map(i => i.tipo === 'bloco' ? i : Object.assign({}, i, { musicaId: remap.get(i.musicaId) }));
                }
                r.itens = r.ordens.find(o => o.id === r.ativa).itens;
                const ex = repPorNome.get(norm(r.nome));
                if (ex) r.id = ex.id;
                await operar('repertorios', 'readwrite', s => s.put(r));
                nReps++;
            }
            // Marca que os exemplos / a lista já entraram, para não importarem de novo depois.
            for (const k of Object.keys(dados.meta || {})) await DB.gravarMeta(k, true);
            return { musicas: dados.musicas.length, repertorios: nReps, novas, atualizadas };
        },
    };

    global.DB = DB;
})(window);
