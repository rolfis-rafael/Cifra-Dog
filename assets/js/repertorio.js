/*
 * ============================================================
 *  repertorio.js — Ações da página repertorio.php
 * ============================================================
 *  Partes:
 *   1. Criar repertório (na lista)
 *   2. Mostrar o tom de cada música já transposto
 *   3. Reordenar: arrastar, e botões ↑ ↓ (funcionam no celular)
 *   4. Remover música, renomear e excluir o repertório
 * ============================================================
 */
(function () {
    'use strict';
    const D = window.CIFRADOG;
    const M = window.CifraMotor;

    // ========== 1. Criar ==========
    const formCriar = document.getElementById('form-criar-rep');
    if (formCriar) {
        formCriar.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const r = await CD.api('api/repertorio.php', { acao: 'criar', nome: formCriar.querySelector('input').value });
            location.href = 'repertorio.php?id=' + r.id;
        });
    }

    const lista = document.getElementById('lista-rep');
    if (!lista) return;
    const repId = D.repertorioId;

    // ========== 2. Tom de cada item ==========
    /* Escreve em cada chip o tom já transposto, ex.: "Em → F#m". */
    function pintarTons() {
        lista.querySelectorAll('[data-tom]').forEach(chip => {
            const base = chip.dataset.tom;
            const s = Number(chip.dataset.semitons);
            if (!M.analisarAcorde(base)) { chip.textContent = '—'; return; }
            chip.textContent = s ? base + ' → ' + M.transporTom(base, s, 'auto') : base;
            chip.classList.toggle('chip-ouro', s !== 0);
        });
    }
    /* Renumera as bolinhas 1, 2, 3… depois de mudar a ordem. */
    function renumerar() {
        lista.querySelectorAll('.rep-item').forEach((li, i) => { li.querySelector('.item-rank').textContent = i + 1; });
    }
    /* Manda a ordem atual para o servidor. */
    async function salvarOrdem() {
        const ordem = Array.from(lista.querySelectorAll('.rep-item')).map(li => Number(li.dataset.musica));
        await CD.api('api/repertorio.php', { acao: 'ordenar', repertorio_id: repId, ordem });
    }
    pintarTons();

    // ========== 3. Reordenar ==========
    let arrastando = null;
    lista.addEventListener('dragstart', (ev) => {
        arrastando = ev.target.closest('.rep-item');
        if (arrastando) { arrastando.classList.add('arrastando'); ev.dataTransfer.effectAllowed = 'move'; }
    });
    lista.addEventListener('dragover', (ev) => {
        if (!arrastando) return;
        ev.preventDefault();
        const alvo = ev.target.closest('.rep-item');
        if (!alvo || alvo === arrastando) return;
        const caixa = alvo.getBoundingClientRect();
        // Se o mouse está na metade de cima do alvo, entra antes; senão, depois.
        lista.insertBefore(arrastando, ev.clientY < caixa.top + caixa.height / 2 ? alvo : alvo.nextSibling);
    });
    lista.addEventListener('dragend', async () => {
        if (!arrastando) return;
        arrastando.classList.remove('arrastando');
        arrastando = null;
        renumerar();
        await salvarOrdem();
    });

    lista.addEventListener('click', async (ev) => {
        const li = ev.target.closest('.rep-item');
        if (!li) return;

        // Botões ↑ ↓
        const mover = ev.target.closest('[data-mover]');
        if (mover) {
            const passo = Number(mover.dataset.mover);
            const alvo = passo < 0 ? li.previousElementSibling : li.nextElementSibling;
            if (!alvo) return;
            if (passo < 0) lista.insertBefore(li, alvo); else lista.insertBefore(alvo, li);
            renumerar();
            await salvarOrdem();
            return;
        }

        // ========== 4. Remover música ==========
        if (ev.target.closest('[data-remover]')) {
            await CD.api('api/repertorio.php', { acao: 'remover', repertorio_id: repId, musica_id: Number(li.dataset.musica) });
            li.remove();
            renumerar();
            if (!lista.children.length) location.reload();
        }
    });

    // Renomear
    document.getElementById('btn-renomear').onclick = async () => {
        const nome = prompt('Novo nome do repertório:', D.nomeRep);
        if (!nome || !nome.trim()) return;
        await CD.api('api/repertorio.php', { acao: 'renomear', repertorio_id: repId, nome, descricao: D.descRep });
        location.reload();
    };
    // Excluir
    document.getElementById('btn-excluir-rep').onclick = async () => {
        if (!confirm('Excluir o repertório "' + D.nomeRep + '"? As cifras continuam existindo.')) return;
        await CD.api('api/repertorio.php', { acao: 'excluir', repertorio_id: repId });
        location.href = 'repertorio.php';
    };
})();
