/*
 * ============================================================
 *  editor.js — Ferramentas do editor de cifras (editor.php)
 * ============================================================
 *  Partes:
 *   1. Pré-visualização ao vivo (usa o CifraMotor)
 *   2. Inserir seções ([Refrão]…) na posição do cursor
 *   3. Transpor o texto, detectar tom, converter ChordPro, exemplo
 *   4. Botão "Próximo" entre as abas
 *   5. Aviso ao sair com alterações não salvas
 * ============================================================
 */
(function () {
    'use strict';
    const M = window.CifraMotor;
    const texto = document.getElementById('f-cifra');
    const previa = document.getElementById('previa');
    const faixa = document.getElementById('previa-acordes');
    const campoTom = document.getElementById('f-tom');
    let alterado = false;
    let timer = null;

    // ========== 1. Pré-visualização ==========

    /* Redesenha a pré-visualização com o texto atual. */
    function atualizarPrevia() {
        const t = texto.value;
        document.getElementById('contagem').textContent = t.length.toLocaleString('pt-BR') + ' caracteres';
        if (!t.trim()) {
            previa.innerHTML = '<p class="vazio">A cifra aparece aqui enquanto você digita.</p>';
            faixa.innerHTML = '';
            return;
        }
        const r = M.renderizarCifra(t, { tom: campoTom.value });
        previa.innerHTML = r.html;
        faixa.innerHTML = r.acordes.map(a => '<span class="faixa-item faixa-mini"><b>' + CD.esc(a) + '</b></span>').join('');
    }
    texto.addEventListener('input', () => {
        alterado = true;
        clearTimeout(timer);
        // AJUSTAR: espera (ms) depois de parar de digitar antes de atualizar a prévia.
        timer = setTimeout(atualizarPrevia, 120);
    });
    campoTom.addEventListener('input', () => { alterado = true; });
    atualizarPrevia();

    // ========== 2. Inserir seção ==========
    document.querySelectorAll('[data-secao]').forEach(b => {
        b.addEventListener('click', () => {
            const pos = texto.selectionStart;
            const antes = texto.value.slice(0, pos);
            const depois = texto.value.slice(texto.selectionEnd);
            // Garante uma linha em branco antes (se já houver texto) e quebra depois.
            const prefixo = antes && !antes.endsWith('\n\n') ? (antes.endsWith('\n') ? '\n' : '\n\n') : '';
            const inserido = prefixo + '[' + b.dataset.secao + ']\n';
            texto.value = antes + inserido + depois;
            texto.focus();
            texto.selectionStart = texto.selectionEnd = pos + inserido.length;
            texto.dispatchEvent(new Event('input'));
        });
    });

    // ========== 3. Transpor, detectar tom, ChordPro, exemplo ==========
    document.querySelectorAll('[data-transpor]').forEach(b => {
        b.addEventListener('click', () => {
            const passo = Number(b.dataset.transpor);
            // Bemol ou sustenido? Decide pelo tom de destino (sem tom preenchido, usa sustenido).
            const usarBemol = M.analisarAcorde(campoTom.value) ? M.tomUsaBemol(M.transporTom(campoTom.value, passo, 'auto')) : false;
            texto.value = M.transporTexto(texto.value, passo, usarBemol);
            if (M.analisarAcorde(campoTom.value)) campoTom.value = M.transporTom(campoTom.value, passo, 'auto');
            texto.dispatchEvent(new Event('input'));
            CD.toast('Texto transposto ' + (passo > 0 ? '+' : '−') + '½ tom', 'sucesso');
        });
    });

    document.querySelectorAll('[data-detectar-tom]').forEach(b => b.addEventListener('click', () => {
        const tom = M.detectarTom(texto.value);
        if (tom) { campoTom.value = tom; alterado = true; CD.toast('Tom detectado: ' + tom, 'sucesso'); atualizarPrevia(); }
        else CD.toast('Não encontrei acordes na cifra ainda.', 'erro');
    }));

    document.getElementById('btn-chordpro').addEventListener('click', () => {
        const r = M.chordProParaCifra(texto.value);
        texto.value = r.texto;
        if (r.titulo && !document.getElementById('f-titulo').value) document.getElementById('f-titulo').value = r.titulo;
        if (r.artista && !document.getElementById('f-artista').value) document.getElementById('f-artista').value = r.artista;
        if (r.tom && !campoTom.value) campoTom.value = r.tom;
        texto.dispatchEvent(new Event('input'));
        CD.toast('Convertido do ChordPro', 'sucesso');
    });

    document.getElementById('btn-colar-exemplo').addEventListener('click', () => {
        if (texto.value.trim() && !confirm('Substituir o texto atual pelo exemplo?')) return;
        texto.value = texto.placeholder;
        texto.dispatchEvent(new Event('input'));
    });

    // ========== 4. Navegar entre abas pelo botão "Próximo" ==========
    document.querySelectorAll('[data-ir-aba]').forEach(b => {
        b.addEventListener('click', () => document.querySelector('[data-abas]').abrirAba(b.dataset.irAba, true));
    });

    // ========== 5. Aviso de alterações não salvas ==========
    document.getElementById('form-editor').addEventListener('submit', () => { alterado = false; });
    window.addEventListener('beforeunload', (ev) => { if (alterado) { ev.preventDefault(); ev.returnValue = ''; } });
    document.querySelectorAll('#form-editor input, #form-editor select').forEach(el => el.addEventListener('change', () => { alterado = true; }));
})();
