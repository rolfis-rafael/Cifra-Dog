/*
 * Exemplos da biblioteca inicial e assinaturas para a migração das versões antigas.
 */
(function (global) {
    'use strict';

    const EXEMPLOS = [
        {
            titulo: 'Latido no Palco (demo)', artista: 'Cifra-Dog', tom: 'Am', bpm: 120, compasso: '4/4', curtida: true,
            cifra: `[Intro]
Am  F  C  G
E|-----------------|
B|-----1-----1-----|
G|---2-----2-------|
D|-2-----2---------|
A|0----------------|
E|-----------------|

[Verso]
Am                 F
Liguei o amplificador
C                    G
O cachorro já subiu no palco
Am                  F
Quatro cordas e um tambor
C                       G
E a cidade inteira no embalo

[Refrão]
F          G          Am
Late, late, late mais alto
F           G           C   E7
Que hoje a noite é de rock
F          G          Am
Late, late, late mais alto
F        G        Am
Cifra-Dog no palco`,
        },
        {
            titulo: 'Ciranda, Cirandinha', artista: 'Folclore brasileiro', tom: 'C', bpm: 100, compasso: '2/4',
            cifra: `[Refrão]
C                G7
Ciranda, cirandinha
                  C
Vamos todos cirandar
                    G7
Vamos dar a meia volta
                    C
Volta e meia vamos dar

[Verso]
C                   G7
O anel que tu me destes
                    C
Era vidro e se quebrou
                    G7
O amor que tu me tinhas
                    C
Era pouco e se acabou`,
        },
        {
            titulo: 'Peixe Vivo', artista: 'Folclore brasileiro', tom: 'D', bpm: 90, compasso: '4/4', curtida: true,
            cifra: `[Verso]
D                A7
Como pode o peixe vivo
                  D
Viver fora da água fria
D7          G
Como poderei viver
D           A7
Como poderei viver
             D       G
Sem a tua, sem a tua
A7          D
Sem a tua companhia`,
        },
        {
            titulo: 'Escravos de Jó', artista: 'Folclore brasileiro', tom: 'C', bpm: 110, compasso: '4/4',
            cifra: `[Verso]
C                     G7
Escravos de Jó jogavam caxangá
                     C
Tira, põe, deixa ficar
                          G7
Guerreiros com guerreiros fazem zigue zigue zá
                          C
Guerreiros com guerreiros fazem zigue zigue zá`,
        },
        {
            titulo: 'Amazing Grace', artista: 'John Newton (1779)', tom: 'G', bpm: 80, compasso: '3/4',
            cifra: `[Verso]
G           G7        C       G
Amazing grace, how sweet the sound
                      D
That saved a wretch like me
G            G7     C        G
I once was lost, but now am found
Em        D       G
Was blind, but now I see`,
        },
    ];

    /* Retira apenas as demonstrações originais. Cifras editadas ficam preservadas. */
    async function limparExemplosAntigos() {
        if (await DB.lerMeta('limpeza-exemplos-v28')) return;
        const normalizar = s => String(s || '').replace(/\r\n/g, '\n').trim();
        const musicas = await DB.listarMusicas();
        const remover = musicas.filter(m => EXEMPLOS.some(e => m.titulo === e.titulo && m.artista === e.artista && normalizar(m.cifra) === normalizar(e.cifra)));
        if (remover.length) {
            await DB.gravarMeta('backup-exemplos-v28', { musicas: remover, repertorios: await DB.listarRepertorios() });
            for (const m of remover) await DB.excluirMusica(m.id);
        }
        for (const r of await DB.listarRepertorios()) {
            if (r.nome === 'Ensaio de sábado' && r.descricao === 'Repertório de exemplo' && !r.itens.some(i => i.tipo === 'musica')) await DB.excluirRepertorio(r.id);
        }
        await DB.gravarMeta('semeado', true);
        await DB.gravarMeta('limpeza-exemplos-v28', true);
    }

    async function semearSePreciso() {
        await limparExemplosAntigos();
        const exemplos = [
            EXEMPLOS[0], EXEMPLOS[2], EXEMPLOS[4],
            { titulo: 'O Sol', artista: 'Vitor Kley', tom: 'Em', fonte: 'https://www.cifraclub.com.br/vitor-kley/o-sol/' },
            { titulo: 'Wish You Were Here', artista: 'Pink Floyd', tom: 'G', fonte: 'https://www.cifraclub.com.br/pink-floyd/wish-you-were-here/' },
        ];
        for (let i = exemplos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [exemplos[i], exemplos[j]] = [exemplos[j], exemplos[i]];
        }
        // A biblioteca ordena por data de criação, inclusive quando são salvas no mesmo milissegundo.
        const agora = Date.now();
        await DB.adicionarExemplosSeVazio(exemplos.map((m, i) => ({ ...m, exemplo: true, criadaEm: agora - i })));
    }

    global.Exemplos = { semearSePreciso };
})(window);
