/*
 * banda.js — Banda sincronizada: quem lidera troca de música e rola a cifra,
 * os celulares da banda acompanham. Sem servidor.
 * ---------------------------------------------------------------------------
 * COMO CONECTA (WebRTC, aparelho com aparelho):
 *   1. Quem lidera toca em "Adicionar integrante": aparece um QR (convite).
 *   2. O integrante lê o QR com a câmera: abre o Cifra-Dog em #/banda?o=...
 *      e aparece um QR de RESPOSTA (também dá para copiar o código).
 *   3. Quem lidera toca em "Ler resposta" (câmera) ou cola o código. Pronto.
 *   Funciona na mesma rede Wi-Fi (ou no roteador do celular), mesmo sem internet.
 *   Para cada integrante, um convite novo.
 *
 * MENSAGENS (líder -> integrantes):
 *   { t:'musica', titulo, artista, tom }  -> o integrante abre a mesma música, no tom da banda
 *   { t:'pos', f }                         -> posição da rolagem (0 a 1)
 *   { t:'fim' }                            -> líder encerrou
 *
 * PARTES: 1. conexão  2. líder  3. integrante (#/banda)  4. selo na tela
 */
(function (global) {
    'use strict';
    const { icone, esc, normal, toast, abrirSheet, fecharSheet } = UI;

    // AJUSTAR: servidor STUN público (ajuda em redes diferentes; na mesma Wi-Fi não é preciso).
    const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];
    // AJUSTAR: tempo máximo esperando os "caminhos de rede" antes de gerar o QR.
    const ESPERA_ICE_MS = 2500;
    // AJUSTAR: de quanto em quanto tempo (ms) a posição da rolagem é enviada.
    const INTERVALO_POS = 250;

    const estado = { papel: null, conexoes: [], canal: null, pc: null, ultimaMusica: null };

    /* =====================================================================
       1. CONEXÃO
       ===================================================================== */
    /** Espera juntar os caminhos de rede (ou o tempo máximo) e devolve a descrição local completa. */
    function esperarIce(pc) {
        return new Promise(ok => {
            if (pc.iceGatheringState === 'complete') { ok(); return; }
            const t = setTimeout(ok, ESPERA_ICE_MS);
            pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
        }).then(() => pc.localDescription);
    }
    const suportado = () => !!global.RTCPeerConnection;

    function enviar(msg) {
        const txt = JSON.stringify(msg);
        estado.conexoes.forEach(c => { if (c.dc.readyState === 'open') { try { c.dc.send(txt); } catch (e) { /* caiu */ } } });
    }

    /* =====================================================================
       2. LÍDER
       ===================================================================== */
    const abertas = () => estado.conexoes.filter(c => c.dc.readyState === 'open').length;

    /** Cria um convite: devolve { link, aplicarResposta(codigo) }. */
    async function novoConvite() {
        const pc = new RTCPeerConnection({ iceServers: ICE });
        const dc = pc.createDataChannel('cifradog', { ordered: true });
        const con = { pc, dc };
        let aplicada = false;                       // depois da resposta, fechar o painel NÃO pode derrubar a conexão
        dc.onopen = () => {
            estado.papel = 'lider';
            if (!estado.conexoes.includes(con)) estado.conexoes.push(con);
            toast('Integrante conectado (' + abertas() + ')');
            desenharSelo(); anunciarAtual();
        };
        dc.onclose = () => { estado.conexoes = estado.conexoes.filter(x => x !== con); desenharSelo(); if (estado.papel === 'lider') toast('Um integrante saiu'); };
        await pc.setLocalDescription(await pc.createOffer());
        const desc = await esperarIce(pc);
        const codigo = await Compartilhar.empacotar({ v: 1, sdp: desc.sdp });
        const link = location.href.split('#')[0].replace(/index\.html$/, '') + '#/banda?o=' + codigo;
        return {
            link,
            async aplicarResposta(cod) {
                const d = await Compartilhar.desempacotar(String(cod || '').trim().replace(/^.*[?&#]r=/, ''));
                if (!d || d.v !== 1 || !d.sdp) throw new Error('Código de resposta inválido.');
                await pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
                aplicada = true;
            },
            cancelar() { if (!aplicada && dc.readyState !== 'open') pc.close(); },
        };
    }

    /** Painel da banda (líder). */
    async function abrirLider() {
        if (!suportado()) { toast('Este navegador não permite conectar aparelhos'); return; }
        if (estado.papel === 'seguidor') { gerenciarSeguidor(); return; }
        abrirSheet(
            '<h3 style="margin:0 0 6px">Banda sincronizada</h3>' +
            '<p class="dica" style="margin:0 0 10px">Você lidera: quando trocar de música ou rolar a cifra, os celulares da banda acompanham. Todos na mesma Wi-Fi (pode ser o roteador do seu celular).</p>' +
            '<p><b>' + abertas() + '</b> integrante(s) conectado(s).</p>' +
            '<button class="bt prim cheio" id="bd-add">' + icone('mais') + 'Adicionar integrante</button>' +
            (abertas() ? '<button class="bt cheio" id="bd-fim" style="margin-top:8px">Encerrar a banda</button>' : ''),
            sh => {
                sh.querySelector('#bd-add').onclick = () => { fecharSheet(); setTimeout(convidar, 60); };
                const fim = sh.querySelector('#bd-fim');
                if (fim) fim.onclick = () => { encerrar(); fecharSheet(); };
            });
    }

    async function convidar() {
        abrirSheet('<h3 style="margin:0 0 6px">Convite</h3><p class="dica">Preparando a conexão…</p>');
        let conv;
        try { conv = await novoConvite(); } catch (e) { fecharSheet(); toast('Não deu para criar o convite'); return; }
        let leitor = null;
        abrirSheet(
            '<h3 style="margin:0 0 6px">1. O integrante lê este QR</h3>' +
            '<div style="background:#fff;border-radius:8px;padding:6px;max-width:300px;margin:0 auto">' + Compartilhar.svgQr(conv.link) + '</div>' +
            '<div class="dupla" style="margin-top:8px"><button class="bt" id="bd-copiar">' + icone('colar') + 'Copiar convite</button><span></span></div>' +
            '<h3 style="margin:14px 0 6px">2. Leia a resposta dele</h3>' +
            (('BarcodeDetector' in global) ? '<button class="bt prim cheio" id="bd-ler">' + icone('busca') + 'Ler QR da resposta</button><video id="bd-video" playsinline muted style="width:100%;border-radius:8px;margin-top:8px" hidden></video>' : '') +
            '<form class="form" id="bd-f" style="margin-top:8px"><textarea class="entrada" id="bd-cod" rows="2" placeholder="…ou cole aqui o código de resposta" spellcheck="false"></textarea><button class="bt cheio">Conectar</button></form>',
            sh => {
                sh.querySelector('#bd-copiar').onclick = () => navigator.clipboard.writeText(conv.link).then(() => toast('Convite copiado'), () => toast('Não deu para copiar'));
                const conectar = async (cod) => {
                    try { await conv.aplicarResposta(cod); toast('Conectando…'); fecharSheet(); }
                    catch (e) { toast(e.message || 'Código inválido'); }
                };
                sh.querySelector('#bd-f').onsubmit = (e) => { e.preventDefault(); conectar(sh.querySelector('#bd-cod').value); };
                const ler = sh.querySelector('#bd-ler');
                if (ler) ler.onclick = async () => {
                    try { leitor = await lerQr(sh.querySelector('#bd-video'), (txt) => { leitor && leitor(); leitor = null; conectar(txt); }); }
                    catch (e) { toast('Câmera indisponível: cole o código'); }
                };
            },
            () => { if (leitor) leitor(); conv.cancelar(); });
    }

    /** Lê QR pela câmera (BarcodeDetector). Chama aoLer(texto). Devolve a função que desliga a câmera. */
    async function lerQr(video, aoLer) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream; video.hidden = false; await video.play();
        const det = new BarcodeDetector({ formats: ['qr_code'] });
        let parado = false;
        const parar = () => { parado = true; stream.getTracks().forEach(t => t.stop()); video.hidden = true; };
        (async function laco() {
            while (!parado) {
                try { const r = await det.detect(video); if (r[0] && r[0].rawValue) { aoLer(r[0].rawValue); return; } } catch (e) { /* quadro ruim */ }
                await new Promise(ok => setTimeout(ok, 250));
            }
        })();
        return parar;
    }

    /** Envia a música aberta (chamado ao trocar de tela e quando alguém entra). */
    async function anunciarAtual() {
        if (estado.papel !== 'lider' || !abertas()) return;
        const m = /^#\/cifra\/([\w-]+)(?:\?(.*))?$/.exec(location.hash);
        if (!m) return;
        const mus = await DB.pegarMusica(m[1]); if (!mus) return;
        const q = new URLSearchParams(m[2] || '');
        let semitons = mus.semitons || 0;
        if (q.get('rep')) {
            const rep = await DB.pegarRepertorio(q.get('rep'));
            const it = rep && rep.itens.filter(i => i.tipo === 'musica')[parseInt(q.get('i'), 10) || 0];
            if (it && it.musicaId === mus.id) semitons = it.semitons || 0;
        }
        if (q.get('st') !== null && q.get('st') !== '') semitons = +q.get('st') || 0;
        const tom = mus.tom ? CifraMotor.transporTom(mus.tom, semitons) : '';
        enviar({ t: 'musica', titulo: mus.titulo, artista: mus.artista || '', tom });
    }
    let ultimoEnvio = 0, pendente = null;
    function aoRolar() {
        if (estado.papel !== 'lider' || !abertas() || !location.hash.startsWith('#/cifra/')) return;
        const agora = performance.now();
        const mandar = () => {
            ultimoEnvio = performance.now(); pendente = null;
            const max = document.documentElement.scrollHeight - innerHeight;
            enviar({ t: 'pos', f: max > 0 ? Math.round(scrollY / max * 10000) / 10000 : 0 });
        };
        if (agora - ultimoEnvio >= INTERVALO_POS) mandar();
        else if (!pendente) pendente = setTimeout(mandar, INTERVALO_POS);
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('hashchange', () => setTimeout(anunciarAtual, 300));

    function encerrar() {
        enviar({ t: 'fim' });
        estado.conexoes.forEach(c => { try { c.dc.close(); c.pc.close(); } catch (e) { /* ok */ } });
        estado.conexoes = []; estado.papel = null;
        if (estado.pc) { try { estado.pc.close(); } catch (e) { /* ok */ } estado.pc = null; estado.canal = null; }
        desenharSelo(); toast('Banda encerrada');
    }

    /* =====================================================================
       3. INTEGRANTE (#/banda?o=...)
       ===================================================================== */
    async function telaBanda(p, q) {
        const tela = document.getElementById('tela');
        tela.innerHTML = '<div class="topo"><button class="bt-icone" data-voltar aria-label="Voltar">' + icone('voltar') + '</button><h1 class="titulo" style="margin:0;flex:1;font-size:22px">Entrar na banda</h1></div><div id="bd-area"><p class="dica">Preparando a resposta…</p></div>';
        const area = document.getElementById('bd-area');
        if (!suportado()) { area.innerHTML = '<p class="dica">Este navegador não permite conectar aparelhos.</p>'; return; }
        try {
            const d = await Compartilhar.desempacotar(q.o || '');
            if (!d || d.v !== 1 || !d.sdp) throw new Error('Convite inválido.');
            if (estado.pc) { try { estado.pc.close(); } catch (e) { /* ok */ } }
            const pc = new RTCPeerConnection({ iceServers: ICE });
            estado.pc = pc;
            pc.ondatachannel = (ev) => {
                const dc = ev.channel; estado.canal = dc;
                dc.onopen = () => { estado.papel = 'seguidor'; desenharSelo(); toast('Conectado à banda'); if (document.getElementById('bd-area')) document.getElementById('bd-area').innerHTML = '<div class="vazio"><p><b>Conectado!</b> Agora é só esperar: a música que a banda abrir aparece aqui.</p></div>'; };
                dc.onclose = () => { if (estado.papel === 'seguidor') { estado.papel = null; desenharSelo(); toast('A banda foi desconectada'); } };
                dc.onmessage = (e) => { try { receber(JSON.parse(e.data)); } catch (x) { /* mensagem estranha */ } };
            };
            await pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
            await pc.setLocalDescription(await pc.createAnswer());
            const desc = await esperarIce(pc);
            const codigo = await Compartilhar.empacotar({ v: 1, sdp: desc.sdp });
            area.innerHTML =
                '<p class="dica">Mostre este QR para quem lidera a banda (no app: <b>Banda sincronizada → Ler QR da resposta</b>), ou mande o código.</p>' +
                '<div style="background:#fff;border-radius:8px;padding:6px;max-width:300px;margin:0 auto">' + Compartilhar.svgQr(codigo) + '</div>' +
                '<div class="dupla" style="margin-top:10px"><button class="bt" id="bd-copiar">' + icone('colar') + 'Copiar código</button><span></span></div>' +
                '<p class="dica" id="bd-status">Esperando a conexão…</p>';
            document.getElementById('bd-copiar').onclick = () => navigator.clipboard.writeText(codigo).then(() => toast('Código copiado'), () => toast('Não deu para copiar'));
        } catch (e) {
            area.innerHTML = '<div class="vazio"><p>' + esc(e.message || 'Não deu para abrir o convite.') + '</p><a class="bt prim" href="#/">Ir para o início</a></div>';
        }
    }

    /** O que o integrante faz com cada mensagem. */
    async function receber(msg) {
        if (msg.t === 'fim') { estado.papel = null; desenharSelo(); toast('A banda encerrou'); return; }
        if (msg.t === 'musica') {
            const titulo = String(msg.titulo || '').slice(0, 100), artista = String(msg.artista || '').slice(0, 100);
            const ms = await DB.listarMusicas();
            const local = ms.find(m => normal(m.titulo) === normal(titulo) && normal(m.artista || '') === normal(artista))
                || ms.find(m => normal(m.titulo) === normal(titulo));
            estado.ultimaMusica = local ? local.id : null;
            if (!local) { toast('A banda tocou "' + titulo + '": você não tem essa cifra'); return; }
            // Mesmo tom da banda: transpõe a SUA cifra só nesta abertura (não muda o que está salvo).
            const st = msg.tom && local.tom ? Compartilhar.semitonsEntre(local.tom, String(msg.tom)) : 0;
            const destino = '#/cifra/' + local.id + (st ? '?st=' + st : '');
            if (location.hash !== destino) location.hash = destino;
            return;
        }
        if (msg.t === 'pos') {
            if (!estado.ultimaMusica || !location.hash.startsWith('#/cifra/' + estado.ultimaMusica)) return;
            if (UI.usuarioRolando && UI.usuarioRolando()) return;        // a pessoa está mexendo: não puxa a tela
            const f = Math.max(0, Math.min(1, +msg.f || 0));
            const max = document.documentElement.scrollHeight - innerHeight;
            window.scrollTo(0, Math.round(f * max));
        }
    }

    function gerenciarSeguidor() {
        abrirSheet('<h3 style="margin:0 0 6px">Seguindo a banda</h3><p class="dica">A tela acompanha quem lidera. Mexer com o dedo pausa o acompanhamento por um instante.</p><button class="bt cheio" id="bd-sair">Sair da banda</button>',
            sh => sh.querySelector('#bd-sair').onclick = () => { estado.papel = null; try { estado.pc && estado.pc.close(); } catch (e) { /* ok */ } estado.pc = null; desenharSelo(); fecharSheet(); toast('Você saiu da banda'); });
    }

    /* =====================================================================
       4. SELO NA TELA ("Banda · 2" / "Seguindo a banda")
       ===================================================================== */
    function desenharSelo() {
        let s = document.getElementById('banda-selo');
        if (!estado.papel) { if (s) s.remove(); return; }
        if (!s) { s = document.createElement('button'); s.id = 'banda-selo'; s.type = 'button'; document.body.appendChild(s); }
        s.textContent = estado.papel === 'lider' ? '● Banda · ' + abertas() : '● Seguindo a banda';
        s.onclick = () => (estado.papel === 'lider' ? abrirLider() : gerenciarSeguidor());
    }

    global.Banda = { abrirLider, novoConvite, papel: () => estado.papel, conectados: abertas, encerrar };
    global.Telas.banda = telaBanda;
})(window);
