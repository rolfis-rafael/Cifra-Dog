/* Um único player por vez. O processamento local é carregado apenas ao mudar o tom. */
(function (global) {
    'use strict';
    const { esc, icone, toast } = UI;
    let atual = null, apiPromise = null;
    const baseScript = new URL('.', document.currentScript.src);

    function lerYouTube(texto) {
        const raw = String(texto || '').trim();
        if (/^[\w-]{11}$/.test(raw)) return { id: raw, inicio: 0 };
        let url;
        try { url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return null; }
        const host = url.hostname.toLowerCase();
        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'].includes(host)) return null;
        const partes = url.pathname.split('/').filter(Boolean);
        const id = host.endsWith('youtu.be') ? partes[0] : url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(partes[0]) ? partes[1] : '');
        if (!/^[\w-]{11}$/.test(id || '')) return null;
        const tempo = url.searchParams.get('t') || url.searchParams.get('start') || '0';
        let inicio = /^\d+$/.test(tempo) ? Number(tempo) : 0;
        if (!inicio) for (const m of tempo.matchAll(/(\d+)(h|m|s)/g)) inicio += Number(m[1]) * ({ h: 3600, m: 60, s: 1 })[m[2]];
        return { id, inicio: Math.min(inicio, 86400) };
    }
    function carregarAPI() {
        if (global.YT?.Player) return Promise.resolve();
        if (apiPromise) return apiPromise;
        apiPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            let timer;
            const anterior = global.onYouTubeIframeAPIReady;
            global.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(); if (typeof anterior === 'function') anterior(); };
            const falhou = () => { clearTimeout(timer); script.remove(); apiPromise = null; reject(new Error('Não foi possível conectar ao YouTube. Confira a internet e tente novamente.')); };
            script.src = 'https://www.youtube.com/iframe_api'; script.async = true; script.onerror = falhou;
            timer = setTimeout(falhou, 15000); document.head.appendChild(script);
        });
        return apiPromise;
    }
    function status(s, texto) { if (!s.fechado) s.root.querySelector('#aula-status').textContent = texto; }
    async function limparMidia(s) {
        const carga = ++s.carga;
        if (s.youtube) { try { s.youtube.destroy(); } catch {} s.youtube = null; }
        s.media.pause(); s.media.removeAttribute('src'); s.media.load();
        const audio = s.audio;
        s.audio = null; s.source = null; s.pitch = null;
        if (s.objectURL) { URL.revokeObjectURL(s.objectURL); s.objectURL = null; }
        if (audio) await audio.close().catch(() => {});
        // Cada elemento só pode ter um MediaElementAudioSourceNode durante sua vida.
        if (!s.fechado && carga === s.carga) {
            const media = s.media.cloneNode(false);
            s.media.replaceWith(media); s.media = media; s.configurarMedia();
        }
    }
    function definirFonte(s, tipo) {
        s.tipo = tipo; s.semitons = 0; s.pronto=false;
        s.root.classList.remove('recolhido'); s.root.hidden = false; s.retorno.hidden = true;
        s.root.querySelector('#aula-local').hidden = tipo !== 'local';
        s.root.querySelector('#aula-youtube').hidden = tipo !== 'youtube';
        s.root.querySelector('#aula-vazia').hidden = true;
        s.root.querySelector('#aula-pitch').disabled = tipo !== 'local';
        s.root.querySelector('#aula-ocultar').textContent = tipo === 'youtube' ? 'Recolher' : 'Ocultar';
        s.root.querySelector('#aula-modo').textContent = tipo === 'youtube' ? 'Vídeo do YouTube' : 'Arquivo do aparelho';
        s.root.querySelector('#aula-aviso').textContent = tipo === 'youtube'
            ? 'O YouTube permite velocidade, mas não mudança de tom. Para transpor o áudio, abra um arquivo do aparelho.'
            : 'Mude o tom sem mudar a velocidade. O arquivo fica só neste aparelho.';
        desenharPitch(s);
    }
    async function abrirYouTube(s, texto) {
        const video = lerYouTube(texto);
        if (!video) { status(s, 'Cole um link válido de vídeo do YouTube.'); return; }
        const pedido = ++s.pedido;
        await limparMidia(s);
        if (s.fechado || pedido !== s.pedido) return;
        definirFonte(s, 'youtube');
        const carga = s.carga;
        s.root.querySelector('#aula-youtube').innerHTML = '<div id="aula-yt-player"></div>';
        status(s, 'Conectando ao YouTube…');
        try {
            await carregarAPI();
            if (s.fechado || carga !== s.carga) return;
            s.youtube = new YT.Player('aula-yt-player', {
                width: '100%', height: '100%', videoId: video.id,
                playerVars: { playsinline: 1, origin: location.origin, start: video.inicio, rel: 0 },
                events: {
                    onReady(event) {
                        if (s.fechado || carga !== s.carga) return;
                        s.pronto=true;
                        const iframe = event.target.getIframe();
                        iframe.title = 'Vídeo para aprender ' + s.musica.titulo;
                        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                        const rates = event.target.getAvailablePlaybackRates() || [1];
                        s.root.querySelector('#aula-velocidade').innerHTML = rates.map(r => '<option value="' + r + '"' + (r === 1 ? ' selected' : '') + '>' + r + '×</option>').join('');
                        status(s, 'Dê o play no vídeo para começar.');
                    },
                    onError(event) {
                        const mensagens = { 100: 'Vídeo removido ou privado.', 101: 'Este vídeo não permite reprodução aqui.', 150: 'Este vídeo não permite reprodução aqui.', 153: 'O YouTube não reconheceu este endereço. Abra o app por localhost ou HTTPS.' };
                        status(s, (mensagens[event.data] || 'Não foi possível reproduzir este vídeo.') + ' Você pode tentar outro link.');
                    },
                },
            });
            s.musica.youtube = video.id;
            await DB.atualizarMusica(s.musica.id, { youtube: video.id });
        } catch (e) { status(s, e.message); }
    }
    async function abrirArquivo(s, file) {
        if (!file) return;
        if (!/^(audio|video)\//.test(file.type) && !/\.(mp3|wav|ogg|m4a|aac|flac|mp4|webm|mov)$/i.test(file.name)) { status(s, 'Escolha um arquivo de áudio ou vídeo.'); return; }
        const pedido = ++s.pedido;
        await limparMidia(s); if (s.fechado || pedido !== s.pedido) return;
        definirFonte(s, 'local');
        s.objectURL = URL.createObjectURL(file); s.media.src = s.objectURL;
        s.media.hidden = false; s.media.playbackRate = 1; s.media.preservesPitch = true;
        s.root.querySelector('#aula-velocidade').innerHTML = [0.5, 0.75, 1, 1.25, 1.5].map(r => '<option' + (r === 1 ? ' selected' : '') + ' value="' + r + '">' + r + '×</option>').join('');
        status(s, file.name + ' · pronto para tocar');
    }
    async function prepararPitch(s) {
        if (s.pitch) return;
        if (s.pitchPromise) return s.pitchPromise;
        s.pitchPromise = (async () => {
            const AudioContext = global.AudioContext || global.webkitAudioContext;
            if (!AudioContext || !global.AudioWorkletNode) throw new Error('Para mudar o tom, use Chrome, Edge ou Safari atualizado em localhost ou HTTPS.');
            const context = new AudioContext({ latencyHint: 'playback' });
            s.audio = context;
            if (!context.audioWorklet) { await context.close(); s.audio = null; throw new Error('A mudança de tom precisa de localhost ou HTTPS.'); }
            try {
                await context.resume();
                await context.audioWorklet.addModule(new URL('pitch-worklet.js', baseScript).href);
                if (s.fechado || s.tipo !== 'local' || s.audio !== context) { await context.close().catch(() => {}); return; }
                s.pitch = new AudioWorkletNode(context, 'cifra-pitch', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
                s.source = context.createMediaElementSource(s.media);
                s.source.connect(context.destination);
                if (s.media.paused) await context.suspend();
            } catch (e) {
                if (s.audio === context) { s.audio = null; s.source = null; s.pitch = null; }
                await context.close().catch(() => {}); throw e;
            }
        })();
        try { await s.pitchPromise; } finally { s.pitchPromise = null; }
    }
    function desenharPitch(s) {
        const value = s.root.querySelector('#aula-tom');
        value.textContent = s.semitons > 0 ? '+' + s.semitons : String(s.semitons);
        s.root.querySelector('#aula-pitch-slider').value = s.semitons;
        s.root.querySelectorAll('[data-pitch]').forEach(b => b.classList.toggle('ativo', Number(b.dataset.pitch) === s.semitons));
    }
    async function mudarPitch(s, valor) {
        if (s.fechado || s.tipo !== 'local') return;
        s.semitons = Math.max(-12, Math.min(12, Number(valor) || 0)); desenharPitch(s);
        try {
            if (!s.pitch && s.semitons === 0) return;
            await prepararPitch(s);
            if (s.fechado || !s.pitch || s.tipo !== 'local') return;
            s.source.disconnect(); s.pitch.disconnect();
            if (!s.semitons) s.source.connect(s.audio.destination);
            else { s.source.connect(s.pitch); s.pitch.connect(s.audio.destination); }
            s.pitch.parameters.get('semitons').setValueAtTime(s.semitons, s.audio.currentTime);
            status(s, s.semitons ? 'Áudio ' + (s.semitons > 0 ? '+' : '') + s.semitons + ' semitons · velocidade preservada' : 'Tom original · processamento desligado');
        } catch (e) { s.semitons = 0; desenharPitch(s); status(s, e.message); }
    }
    function fechar() {
        if (!atual) return;
        const s = atual; atual = null; s.fechado = true;
        s.root.remove(); s.retorno.remove(); limparMidia(s);
        if (s.focoAnterior?.isConnected) s.focoAnterior.focus({ preventScroll: true });
    }
    function abrir(musica) {
        if (atual?.musica.id === musica.id) { atual.root.hidden = false; atual.root.classList.remove('recolhido'); atual.retorno.hidden = true; return; }
        fechar();
        const root = document.createElement('section');
        root.id = 'aula-panel'; root.className = 'aula-panel'; root.setAttribute('aria-label', 'Estúdio de aprendizado');
        root.innerHTML = '<header class="aula-cabecalho"><div><span class="eyebrow">Cifra Dog · nos bastidores</span><h2>Aprenda no seu ritmo.</h2><small id="aula-modo">Escolha como ensaiar</small></div><button class="aula-corda" aria-label="Puxar a cordinha e fechar o estúdio"><span aria-hidden="true"></span><small>Fechar</small></button></header>' +
            '<div class="aula-quadro"><div class="aula-video-slot"><div id="aula-vazia"><img src="img/brand/dog-pub.webp" width="88" height="88" decoding="async" alt=""><b>Solta o som.</b><small>Escolha um vídeo ou arquivo abaixo.</small></div><div id="aula-youtube" hidden></div><div id="aula-local" hidden><video id="aula-media" controls playsinline preload="metadata"></video></div></div><span class="quadro-placa">' + esc(musica.titulo) + '</span></div>' +
            '<div class="aula-acoes-topo"><button class="chip" id="aula-ocultar">Recolher</button><button class="chip" id="aula-expandir">Expandir quadro</button><label>Velocidade <select id="aula-velocidade" aria-label="Velocidade do vídeo"><option value="1">1×</option></select></label></div>' +
            '<div class="aula-corpo"><div class="aula-fontes"><form id="aula-link-form"><label for="aula-link">Vídeo do YouTube</label><div class="aula-link-linha"><input class="entrada" id="aula-link" type="text" inputmode="url" placeholder="Cole o link do YouTube" value="' + esc(musica.youtube ? 'https://youtu.be/' + musica.youtube : '') + '"><button class="bt prim" type="submit">Abrir</button></div></form><div class="aula-ou"><span>ou</span></div><label class="bt contorno aula-arquivo">' + icone('subir') + 'Abrir áudio ou vídeo do aparelho<input id="aula-file" type="file" accept="audio/*,video/*" hidden></label></div>' +
            '<fieldset id="aula-pitch" disabled><legend>Pitch shifter · tom do áudio</legend><div class="aula-pitch-controle"><button type="button" class="mini-bt" id="aula-tom-menos" aria-label="Baixar áudio um semitom">−</button><output id="aula-tom">0</output><button type="button" class="mini-bt" id="aula-tom-mais" aria-label="Subir áudio um semitom">+</button><small>semitons</small><button class="chip contorno" data-pitch="0" type="button">Original</button></div><input id="aula-pitch-slider" aria-label="Transposição do áudio em semitons" type="range" min="-12" max="12" step="1" value="0"><div class="aula-presets">' + [-5, -2, 0, 2, 5].map(n => '<button class="chip" type="button" data-pitch="' + n + '">' + (n > 0 ? '+' : '') + n + '</button>').join('') + '</div></fieldset>' +
            '<p class="dica" id="aula-aviso">YouTube para assistir. Arquivo do aparelho para mudar o tom e ouvir com o quadro oculto.</p></div><p id="aula-status" role="status" aria-live="polite">O link do vídeo fica salvo nesta cifra.</p>';
        const retorno = document.createElement('button'); retorno.className = 'aula-retorno'; retorno.hidden = true;
        retorno.innerHTML = icone('play') + '<span>Voltar ao estúdio</span>';
        document.body.append(root, retorno);
        const s = { root, retorno, musica, media: root.querySelector('#aula-media'), tipo: '', youtube: null, semitons: 0, audio: null, pitch: null, source: null, objectURL: null, fechado: false, carga: 0, pedido: 0, focoAnterior: document.activeElement };
        atual = s;
        const corda = root.querySelector('.aula-corda');
        let inicioY = null, dist = 0;
        corda.onpointerdown = e => { inicioY = e.clientY; dist = 0; corda.setPointerCapture(e.pointerId); };
        corda.onpointermove = e => { if (inicioY === null) return; dist = Math.max(0, Math.min(40, e.clientY - inicioY)); corda.style.transform = 'translateY(' + dist + 'px)'; };
        corda.onpointerup = () => { inicioY = null; corda.style.transform = ''; if (dist > 12) fechar(); };
        corda.onpointercancel = () => { inicioY = null; corda.style.transform = ''; };
        corda.onclick = fechar;
        root.querySelector('#aula-link-form').onsubmit = e => { e.preventDefault(); abrirYouTube(s, root.querySelector('#aula-link').value); };
        root.querySelector('#aula-file').onchange = e => abrirArquivo(s, e.target.files[0]);
        root.querySelector('#aula-ocultar').onclick = () => {
            if (s.tipo === 'youtube') { root.classList.add('recolhido'); status(s, 'Player compacto · o YouTube continua visível.'); }
            else if (s.tipo === 'local') { root.hidden = true; retorno.hidden = false; retorno.focus(); }
            else { root.classList.add('recolhido'); }
        };
        root.querySelector('#aula-expandir').onclick = () => { root.classList.remove('recolhido'); };
        retorno.onclick = () => { root.hidden = false; retorno.hidden = true; root.querySelector('#aula-ocultar').focus(); };
        root.querySelector('#aula-velocidade').onchange = e => {
            const rate = Number(e.target.value);
            if (s.tipo === 'youtube') s.youtube?.setPlaybackRate(rate);
            else s.media.playbackRate = rate;
        };
        root.querySelector('#aula-tom-menos').onclick = () => mudarPitch(s, s.semitons - 1);
        root.querySelector('#aula-tom-mais').onclick = () => mudarPitch(s, s.semitons + 1);
        root.querySelector('#aula-pitch-slider').oninput = e => mudarPitch(s, e.target.value);
        root.querySelectorAll('[data-pitch]').forEach(b => b.onclick = () => mudarPitch(s, b.dataset.pitch));
        s.configurarMedia = () => {
            s.media.onplay = () => { s.audio?.resume().catch(() => {}); };
            const suspender = () => { s.audio?.suspend().catch(() => {}); };
            s.media.onpause = suspender; s.media.onended = suspender;
            s.media.onerror = () => { if (s.objectURL) status(s, 'O navegador não conseguiu abrir esse formato. Tente MP3, WAV ou MP4.'); };
        };
        s.configurarMedia();
        const pesquisa=document.createElement('details');pesquisa.className='mais';pesquisa.innerHTML='<summary>Pesquisar uma versão no YouTube</summary><form id="yt-pesquisa"><label for="yt-termo">Música e artista</label><input id="yt-termo" class="entrada" value="'+esc(musica.titulo+' '+(musica.artista||''))+'"><button class="bt" type="submit">Pesquisar versões</button></form><div id="yt-resultados"></div><details><summary>Configurar busca dentro do app</summary><p class="dica">Requer chave da YouTube Data API, restrita a este site. Sem chave, a pesquisa abre no YouTube.</p><input id="yt-chave" class="entrada" type="password" aria-label="Chave pública restrita da YouTube Data API"><button class="chip" id="yt-salvar-chave">Guardar chave</button></details>';
        root.querySelector('.aula-fontes').prepend(pesquisa);
        DB.lerMeta('youtube-api-key').then(key=>{if(!s.fechado)pesquisa.querySelector('#yt-chave').value=key||'';});
        pesquisa.querySelector('#yt-salvar-chave').onclick=async()=>{await DB.gravarMeta('youtube-api-key',pesquisa.querySelector('#yt-chave').value.trim());status(s,'Configuração de busca guardada.');};
        pesquisa.querySelector('#yt-pesquisa').onsubmit=async e=>{e.preventDefault();const q=pesquisa.querySelector('#yt-termo').value.trim();if(!q)return;const key=await DB.lerMeta('youtube-api-key');if(!key){window.open('https://www.youtube.com/results?search_query='+encodeURIComponent(q),'_blank','noopener');status(s,'Escolha a gravação no YouTube. Para resultados aqui, configure a chave da busca.');return;}const res=pesquisa.querySelector('#yt-resultados');res.textContent='Pesquisando…';try{const params=new URLSearchParams({part:'snippet',type:'video',videoEmbeddable:'true',maxResults:'6',q,key});const response=await fetch('https://www.googleapis.com/youtube/v3/search?'+params);if(!response.ok)throw Error('Não foi possível pesquisar. Confira a chave e a cota da API.');const data=await response.json();if(s.fechado)return;res.innerHTML=(data.items||[]).map(v=>'<button type="button" class="op" data-yt="'+esc(v.id.videoId)+'"><span>'+esc(v.snippet.title)+'<small style="display:block">'+esc(v.snippet.channelTitle)+'</small></span></button>').join('')||'Nenhuma versão encontrada.';res.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{root.querySelector('#aula-link').value='https://youtu.be/'+b.dataset.yt;abrirYouTube(s,b.dataset.yt);pesquisa.open=false;});}catch(error){res.textContent=error.message;}};
        if(musica.youtube) abrirYouTube(s,musica.youtube);
        root.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') fechar(); });
        retorno.addEventListener('keydown', e => e.stopPropagation());
        root.querySelector('#aula-link').focus({ preventScroll: true });
    }
    global.Aprender = { abrir, fechar, lerYouTube,
        tempo: () => atual?.tipo === 'youtube' ? atual.youtube?.getCurrentTime?.() || 0 : atual?.media.currentTime || 0,
        irPara: t => { if(atual?.tipo==='youtube') atual.youtube?.seekTo?.(Math.max(0,t),true); else if(atual) atual.media.currentTime=Math.max(0,t); },
        tocar: () => { if(atual?.tipo==='youtube') atual.youtube?.playVideo?.(); else atual?.media.play().catch(()=>{}); },
        pausar: () => { if(atual?.tipo==='youtube') atual.youtube?.pauseVideo?.(); else atual?.media.pause(); },
        pronto: () => atual?.tipo==="youtube"?!!atual.pronto:!!atual&&atual.media.readyState>=2,
        tocando: () => atual?.tipo==='youtube' ? atual.youtube?.getPlayerState?.()===1 : !!atual&&!atual.media.paused,
        estado: () => atual ? { tipo: atual.tipo, semitons: atual.semitons, processando: !!atual.pitch && !!atual.semitons, oculto: atual.root.hidden, recolhido: atual.root.classList.contains('recolhido'), audio: atual.audio?.state || null } : null };
})(window);
