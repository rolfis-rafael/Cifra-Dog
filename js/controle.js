/*
 * controle.js — Controle por pedal: MIDI (Web MIDI) e teclas (pedais em modo teclado).
 *
 * Funciona com qualquer controlador, incluindo o M-VAVE Chocolate Plus:
 *   - Modo MIDI (PC, CC ou Nota): ative o MIDI em Configurações e "aprenda" cada botão.
 *   - Modo teclado (Page Up/Down, setas, Espaço...): não precisa de MIDI, só aprender os botões.
 *
 * Assinatura de um botão (texto usado no mapa):
 *   m:n:<canal>:<nota>   Nota (note on)
 *   m:c:<canal>:<cc>     Control Change (aciona com valor >= 64; no modo alternado, qualquer valor)
 *   m:p:<canal>:<pc>     Program Change
 *   k:<code>             Tecla (KeyboardEvent.code)
 */
(function (global) {
    'use strict';

    const CHAVE = 'cifradog:controle';

    /* Ações que um botão pode fazer. AJUSTAR: novas ações entram aqui e no contexto da tela da cifra. */
    const ACOES = [
        ['musica-proxima', 'Próxima música do repertório'],
        ['musica-anterior', 'Música anterior do repertório'],
        ['tela-descer', 'Descer a tela da cifra'],
        ['tela-subir', 'Subir a tela da cifra'],
        ['tela-topo', 'Voltar ao início da cifra'],
        ['rolagem', 'Iniciar / pausar a rolagem'],
        ['rolagem-parar', 'Parar a rolagem'],
        ['rolagem-travar', 'Travar / destravar a rolagem'],
        ['frase-proxima', 'Próxima frase (rolagem por BPM)'],
        ['frase-anterior', 'Frase anterior (rolagem por BPM)'],
        ['buscar', 'Pesquisar música no repertório'],
        ['tom-mais', 'Subir meio tom'],
        ['tom-menos', 'Baixar meio tom'],
        ['tom-original', 'Voltar ao tom original'],
        ['fonte-mais', 'Aumentar a letra'],
        ['fonte-menos', 'Diminuir a letra'],
        ['palco', 'Modo palco (tela cheia)'],
        ['curtir', 'Curtir a música'],
        ['botao-custom', 'Fazer o que estiver no botão personalizável'],
        ['botao-trocar', 'Trocar a função do botão personalizável (próxima)'],
    ].map(([id, nome]) => ({ id, nome }));

    /* Teclas que já vêm funcionando (pode trocar ou desligar em Configurações). */
    const TECLAS_PADRAO = {
        'k:PageDown': 'tela-descer', 'k:PageUp': 'tela-subir',
        'k:ArrowRight': 'musica-proxima', 'k:ArrowLeft': 'musica-anterior',
        'k:Space': 'rolagem', 'k:KeyP': 'palco',
        'k:KeyS': 'rolagem-parar', 'k:KeyL': 'rolagem-travar',
        'k:Equal': 'tom-mais', 'k:NumpadAdd': 'tom-mais', 'k:Minus': 'tom-menos', 'k:NumpadSubtract': 'tom-menos',
    };

    const PADRAO = {
        ativo: false,        // MIDI ligado
        rolagemPct: 70,      // quanto o pedal desce/sobe, em % da área visível
        pcMusica: true,      // Program Change sem botão definido -> vai para a música nº (PC + 1)
        ccAlternado: false,  // pedal em modo alternado: CC com valor 0 também aciona
        segurarTrava: true,  // segurar o botão de rolagem (descer/subir/iniciar/parar) trava a rolagem
        segurarMs: 700,      // quanto tempo segurar para travar
        mapa: {},            // assinatura -> ação ('' = desligado)
    };

    function cfg() {
        try { return Object.assign({}, PADRAO, JSON.parse(localStorage.getItem(CHAVE) || '{}')); }
        catch (e) { return Object.assign({}, PADRAO); }
    }
    function salvarCfg(mudancas) {
        const c = Object.assign(cfg(), mudancas);
        try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch (e) { /* sem espaço */ }
        return c;
    }

    /* ---------- Mapa de botões ---------- */
    function acaoDe(sig) {
        const mapa = cfg().mapa;
        if (Object.prototype.hasOwnProperty.call(mapa, sig)) return mapa[sig] || null;
        return TECLAS_PADRAO[sig] || null;
    }
    /* Todas as assinaturas ligadas a uma ação (as do usuário + as padrão não desligadas). */
    function assinaturasDe(acao) {
        const mapa = cfg().mapa;
        const lista = Object.keys(mapa).filter(s => mapa[s] === acao);
        Object.keys(TECLAS_PADRAO).forEach(s => {
            if (TECLAS_PADRAO[s] === acao && !Object.prototype.hasOwnProperty.call(mapa, s)) lista.push(s);
        });
        return lista;
    }
    function ligar(acao, sig) {
        const anterior = acaoDe(sig);
        const mapa = cfg().mapa; mapa[sig] = acao; salvarCfg({ mapa });
        return anterior && anterior !== acao ? anterior : null;
    }
    function desligar(sig) {
        const mapa = cfg().mapa;
        if (TECLAS_PADRAO[sig]) mapa[sig] = ''; else delete mapa[sig];
        salvarCfg({ mapa });
    }
    function restaurarPadrao() { salvarCfg({ mapa: {} }); }
    const nomeAcao = (id) => (ACOES.find(a => a.id === id) || {}).nome || id;

    /* ---------- Textos para a tela ---------- */
    const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const TECLAS_NOMES = { ArrowRight: 'Seta →', ArrowLeft: 'Seta ←', ArrowUp: 'Seta ↑', ArrowDown: 'Seta ↓', PageDown: 'Page Down', PageUp: 'Page Up', Space: 'Espaço', Enter: 'Enter', NumpadEnter: 'Enter', Equal: '+ / =', Minus: '−', NumpadAdd: '+ (num)', NumpadSubtract: '− (num)', Backspace: 'Backspace', Tab: 'Tab', MediaTrackNext: 'Mídia: próxima', MediaTrackPrevious: 'Mídia: anterior', MediaPlayPause: 'Mídia: play/pausa', AudioVolumeUp: 'Volume +', AudioVolumeDown: 'Volume −' };
    function descrever(sig) {
        const p = sig.split(':');
        if (p[0] === 'k') return 'Tecla ' + (TECLAS_NOMES[p[1]] || p[1].replace(/^Key|^Digit/, ''));
        const canal = ' · canal ' + p[2], n = parseInt(p[3], 10);
        if (p[1] === 'n') return 'Nota ' + NOTAS[n % 12] + (Math.floor(n / 12) - 1) + ' (' + n + ')' + canal;
        if (p[1] === 'c') return 'CC ' + n + canal;
        if (p[1] === 'p') return 'PC ' + n + canal;
        return sig;
    }

    /* ---------- Estado do MIDI ---------- */
    const estado = { suportado: typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess, ligado: false, erro: '', entradas: [], ultima: '' };
    let acesso = null;
    let aoMudarFn = null;
    const avisar = () => { if (aoMudarFn) aoMudarFn(estado); };

    /* Traduz uma mensagem MIDI em assinatura de "botão apertado" (ou null se não é um acionamento). */
    function assinaturaMidi(bytes) {
        const st = bytes[0], tipo = st & 0xF0, canal = (st & 0x0F) + 1, d1 = bytes[1], d2 = bytes[2];
        if (tipo === 0x90 && d2 > 0) return 'm:n:' + canal + ':' + d1;
        if (tipo === 0xB0 && (d2 >= 64 || cfg().ccAlternado)) return 'm:c:' + canal + ':' + d1;
        if (tipo === 0xC0) return 'm:p:' + canal + ':' + d1;
        return null;
    }
    /* Mensagem MIDI de "botão solto" (nota solta, CC voltando a 0). */
    function assinaturaSolta(bytes) {
        const st = bytes[0], tipo = st & 0xF0, canal = (st & 0x0F) + 1, d1 = bytes[1], d2 = bytes[2];
        if (tipo === 0x80 || (tipo === 0x90 && d2 === 0)) return 'm:n:' + canal + ':' + d1;
        if (tipo === 0xB0 && d2 < 64 && !cfg().ccAlternado) return 'm:c:' + canal + ':' + d1;
        return null;
    }
    function textoMidi(bytes) {
        const st = bytes[0], tipo = st & 0xF0, canal = (st & 0x0F) + 1;
        const nomes = { 0x80: 'Nota solta', 0x90: 'Nota', 0xB0: 'CC', 0xC0: 'PC', 0xE0: 'Pitch bend' };
        return (nomes[tipo] || 'Msg ' + st) + ' ' + bytes[1] + (bytes.length > 2 ? ' = ' + bytes[2] : '') + ' · canal ' + canal;
    }

    async function iniciarMidi() {
        if (!estado.suportado) { estado.erro = 'Este navegador não tem MIDI (use o Chrome ou o Edge; no iPhone não funciona).'; avisar(); return false; }
        try {
            acesso = await navigator.requestMIDIAccess({ sysex: false });
        } catch (e) {
            estado.erro = 'O navegador não liberou o MIDI (' + (e.message || e.name) + '). Permita o MIDI para este site.';
            estado.ligado = false; avisar(); return false;
        }
        const conectar = () => {
            estado.entradas = [];
            acesso.inputs.forEach(inp => {
                inp.onmidimessage = (ev) => receber(Array.from(ev.data));
                estado.entradas.push(inp.name + (inp.state === 'connected' ? '' : ' (desconectado)'));
            });
            avisar();
        };
        acesso.onstatechange = conectar;
        conectar();
        estado.ligado = true; estado.erro = '';
        salvarCfg({ ativo: true });
        avisar();
        return true;
    }
    function desligarMidi() {
        if (acesso) { acesso.inputs.forEach(inp => { inp.onmidimessage = null; }); acesso.onstatechange = null; }
        acesso = null; estado.ligado = false; estado.entradas = [];
        salvarCfg({ ativo: false }); avisar();
    }

    /* ---------- Aprender um botão ---------- */
    let aprendendo = null; // { resolver, timer }
    function aprender(tempoMs) {
        cancelarAprender();
        return new Promise(ok => {
            aprendendo = { resolver: ok, timer: setTimeout(() => cancelarAprender(), tempoMs || 12000) };
        });
    }
    function cancelarAprender() {
        if (!aprendendo) return;
        clearTimeout(aprendendo.timer);
        const r = aprendendo.resolver; aprendendo = null; r(null);
    }
    function terminarAprender(sig) {
        clearTimeout(aprendendo.timer);
        const r = aprendendo.resolver; aprendendo = null; r(sig);
    }

    /* ---------- Contexto: a tela da cifra registra o que cada ação faz ---------- */
    let contexto = null;
    function registrar(ctx) { contexto = ctx; }
    function liberar(ctx) { if (contexto === ctx) { contexto = null; cancelarSegurar(); pararAnim(); if (travado) { travado = false; desenharIndicador(); } } }

    /* ---------- Rolagem suave (animada a cada quadro, sem "pulos") ---------- */
    let anim = null; // { alvo, y, ultimo, raf }
    function pararAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
    function rolarSuave(delta) {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const base = anim ? anim.alvo : window.scrollY;      // pisadas seguidas somam no destino
        const alvo = Math.max(0, Math.min(max, base + delta));
        const y0 = anim ? anim.y : window.scrollY;
        pararAnim();
        anim = { alvo, y: y0, ultimo: 0, raf: 0 };
        const passo = (t) => {
            if (!anim) return;
            const dt = anim.ultimo ? Math.min(64, t - anim.ultimo) : 16;
            anim.ultimo = t;
            // aproximação exponencial: começa rápido e chega devagar ao destino (movimento "liso")
            anim.y += (anim.alvo - anim.y) * (1 - Math.exp(-dt / 110));
            if (Math.abs(anim.alvo - anim.y) < 0.6) { window.scrollTo(0, anim.alvo); anim = null; return; }
            window.scrollTo(0, anim.y);
            anim.raf = requestAnimationFrame(passo);
        };
        anim.raf = requestAnimationFrame(passo);
    }
    // Se a pessoa ARRASTAR a tela (dedo ou roda do mouse), a animação sai da frente.
    // Só encostar o dedo (segurando o celular) ou tocar num botão da barra não corta mais a descida do pedal.
    ['wheel', 'touchmove'].forEach(ev => window.addEventListener(ev, pararAnim, { passive: true }));
    window.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && !(e.target.closest && e.target.closest('button, a, input, select, textarea, [data-d]'))) pararAnim();
    }, { passive: true });

    /* Rola a tela pela quantidade escolhida no "potenciômetro" (Configurações). */
    function rolarTela(sentido) {
        const visivel = Math.max(200, window.innerHeight - 150); // tira topo fixo e painel de baixo
        const px = Math.round(visivel * cfg().rolagemPct / 100);
        rolarSuave(sentido * px);
    }

    /* ---------- Travar a rolagem (segurar o botão) ---------- */
    let travado = false, indicador = null;
    const BLOQUEADAS = ['rolagem', 'tela-descer', 'tela-subir', 'tela-topo', 'frase-proxima', 'frase-anterior'];
    const SEGURAR = ['rolagem', 'rolagem-parar', 'tela-descer', 'tela-subir'];
    function desenharIndicador() {
        if (!indicador) {
            indicador = document.createElement('div');
            indicador.id = 'trava-ind'; indicador.hidden = true;
            indicador.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3z"/></svg> Rolagem travada';
            document.body.appendChild(indicador);
        }
        indicador.hidden = !travado;
    }
    function alternarTrava(forcar) {
        travado = typeof forcar === 'boolean' ? forcar : !travado;
        pararAnim();
        if (travado && contexto && contexto.acoes && contexto.acoes['rolagem-parar']) contexto.acoes['rolagem-parar']();
        desenharIndicador();
        if (navigator.vibrate) navigator.vibrate(travado ? [40, 40, 40] : 40);
        if (global.UI && UI.toast) UI.toast(travado ? 'Rolagem travada (segure de novo para soltar)' : 'Rolagem liberada');
    }
    function piscarTrava() { if (indicador) { indicador.classList.add('pisca'); setTimeout(() => indicador && indicador.classList.remove('pisca'), 260); } }

    /* Segurar o botão por ~0,7 s trava / destrava. Só vale para botões que mandam "solto" (teclas, Nota, CC). */
    let segurando = null; // { sig, timer }
    function cancelarSegurar() { if (segurando) { clearTimeout(segurando.timer); segurando = null; } }
    function iniciarSegurar(sig, acao) {
        if (!cfg().segurarTrava || SEGURAR.indexOf(acao) < 0) return;
        const p = sig.split(':');
        if (p[0] === 'm' && (p[1] === 'p' || (p[1] === 'c' && cfg().ccAlternado))) return; // sem "solto": não dá para medir
        cancelarSegurar();
        segurando = { sig, timer: setTimeout(() => { segurando = null; alternarTrava(); }, Math.max(300, cfg().segurarMs || 700)) };
    }
    function soltar(sig) { if (segurando && segurando.sig === sig) cancelarSegurar(); }

    function executar(acao) {
        if (acao === 'rolagem-travar') { alternarTrava(); return true; }
        if (travado && BLOQUEADAS.indexOf(acao) >= 0) { piscarTrava(); return true; }
        const fn = contexto && contexto.acoes && contexto.acoes[acao];
        if (fn) { fn(); return true; }
        if (acao === 'tela-descer') { rolarTela(1); return true; }
        if (acao === 'tela-subir') { rolarTela(-1); return true; }
        if (acao === 'tela-topo') { window.scrollTo({ top: 0, behavior: 'smooth' }); return true; }
        return false;
    }

    /* Evita acionar duas vezes quando o pedal "repica". */
    let ultimaSig = '', ultimaHora = 0;
    function disparar(sig) {
        const agora = performance.now();
        if (sig === ultimaSig && agora - ultimaHora < 140) return;
        ultimaSig = sig; ultimaHora = agora;
        if (aprendendo) { terminarAprender(sig); return; }
        const acao = acaoDe(sig);
        if (acao) { iniciarSegurar(sig, acao); executar(acao); return; }
        // Program Change sem botão definido: vai para a música nº (PC + 1) do repertório aberto.
        const p = sig.split(':');
        if (p[0] === 'm' && p[1] === 'p' && cfg().pcMusica && contexto && contexto.irPara) contexto.irPara(parseInt(p[3], 10));
    }

    /* Entrada de MIDI (também usada pelos testes). */
    function receber(bytes) {
        if (!bytes || !bytes.length || bytes[0] >= 0xF0) return; // ignora clock, sysex etc.
        estado.ultima = textoMidi(bytes); avisar();
        const solta = assinaturaSolta(bytes);
        if (solta) soltar(solta);
        const sig = assinaturaMidi(bytes);
        if (sig) disparar(sig);
    }

    /* ---------- Teclado (pedal em modo teclado ou teclado do computador) ---------- */
    const SO_MODIFICADOR = /^(Shift|Control|Alt|Meta|CapsLock)/;
    document.addEventListener('keydown', (e) => {
        if (aprendendo) {
            if (SO_MODIFICADOR.test(e.code)) return;
            e.preventDefault();
            if (e.code === 'Escape') { cancelarAprender(); return; }
            disparar('k:' + e.code);
            return;
        }
        if (!contexto || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
        const fundo = document.getElementById('sheet-fundo');
        if (fundo && !fundo.hidden) return;
        const sig = 'k:' + e.code;
        if (acaoDe(sig)) { e.preventDefault(); disparar(sig); }
    });

    document.addEventListener('keyup', (e) => soltar('k:' + e.code));
    window.addEventListener('blur', cancelarSegurar);

    /* Ao abrir o app: se o MIDI estava ligado, tenta religar sozinho. */
    function iniciar() { if (cfg().ativo) iniciarMidi(); }

    global.Controle = {
        ACOES, cfg, salvarCfg, acaoDe, assinaturasDe, ligar, desligar, restaurarPadrao, nomeAcao, descrever,
        estado, iniciar, iniciarMidi, desligarMidi, aprender, cancelarAprender,
        registrar, liberar, executar, receber, rolarTela, rolarSuave, alternarTrava,
        get travado() { return travado; },
        set aoMudar(fn) { aoMudarFn = fn; },
    };
})(window);
