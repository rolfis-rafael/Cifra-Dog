/* Um único player por vez: YouTube (com pesquisa dentro do app) ou arquivo de áudio/vídeo do aparelho. */
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
        s.root.querySelector('#aula-ocultar').textContent = tipo === 'youtube' ? 'Recolher' : 'Ocultar';
        s.root.querySelector('#aula-modo').textContent = tipo === 'youtube' ? 'Vídeo do YouTube' : 'Arquivo do aparelho';
        s.root.querySelector('#aula-aviso').textContent = tipo === 'youtube'
            ? 'Use a velocidade para ensaiar mais devagar. O vídeo escolhido fica salvo nesta cifra.'
            : 'Use a velocidade para ensaiar mais devagar. O arquivo fica só neste aparelho.';
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
    /* ---------- Pesquisa de vídeos ---------- */
    // Servidores públicos do Piped (busca sem chave). Podem sair do ar: tentamos vários e lembramos o que funcionou.
    const INSTANCIAS = ['https://pipedapi.kavin.rocks', 'https://pipedapi.leptons.xyz', 'https://pipedapi.nosebs.ru', 'https://pipedapi-libre.kavin.rocks',
        'https://api.piped.yt', 'https://pipedapi.adminforge.de', 'https://pipedapi.drgns.space', 'https://pipedapi.owo.si'];
    let instanciaBoa = null;
    const comTempo = (url, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t)); };
    const fmtDuracao = (seg) => { seg = Math.floor(Number(seg) || 0); if (seg <= 0) return ''; const h = Math.floor(seg / 3600), m = Math.floor(seg % 3600 / 60), x = String(seg % 60).padStart(2, '0'); return h ? h + ':' + String(m).padStart(2, '0') + ':' + x : m + ':' + x; };
    async function viaInstancia(base, q) {
        const r = await comTempo(base + '/search?q=' + encodeURIComponent(q) + '&filter=videos', 7000);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!Array.isArray(d.items)) throw new Error('resposta inesperada');
        const lista = d.items.map(i => {
            const id = (() => { try { return new URL(i.url, 'https://www.youtube.com').searchParams.get('v'); } catch { return ''; } })();
            return { id, titulo: i.title, canal: i.uploaderName || '', duracao: fmtDuracao(i.duration), curto: !!i.isShort };
        }).filter(v => /^[\w-]{11}$/.test(v.id || '') && !v.curto).slice(0, 8);
        if (!lista.length) throw new Error('sem resultados');
        instanciaBoa = base;
        return lista;
    }
    async function viaInstancias(q) {
        const ordem = [instanciaBoa, ...INSTANCIAS].filter((x, i, a) => x && a.indexOf(x) === i);
        for (let i = 0; i < ordem.length; i += 4) { // 4 servidores ao mesmo tempo; vale o primeiro que responder
            try { return await Promise.any(ordem.slice(i, i + 4).map(b => viaInstancia(b, q))); } catch { /* tenta o próximo grupo */ }
        }
        throw new Error('Não consegui pesquisar aqui agora: os servidores gratuitos de busca estão fora do ar.');
    }
    async function viaChave(q, key) {
        const params = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '8', regionCode: 'BR', q, key });
        const r = await fetch('https://www.googleapis.com/youtube/v3/search?' + params);
        if (!r.ok) throw new Error('A chave do YouTube foi recusada ou a cota do dia acabou.');
        const d = await r.json();
        return (d.items || []).filter(v => v.id?.videoId).map(v => ({ id: v.id.videoId, titulo: v.snippet.title, canal: v.snippet.channelTitle, duracao: '' }));
    }
    async function pesquisarVideos(q) {
        const key = await DB.lerMeta('youtube-api-key');
        if (key) { try { return await viaChave(q, key); } catch (e) { /* cai para os servidores gratuitos */ } }
        return viaInstancias(q);
    }
    const linkYouTube = (q) => '<a class="chip" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '">Pesquisar no site do YouTube ↗</a>';

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
            '<p class="dica" id="aula-aviso">Pesquise o vídeo da música ou abra um áudio do aparelho.</p></div><p id="aula-status" role="status" aria-live="polite">O link do vídeo fica salvo nesta cifra.</p>';
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
        s.configurarMedia = () => {
            s.media.onplay = () => { s.audio?.resume().catch(() => {}); };
            const suspender = () => { s.audio?.suspend().catch(() => {}); };
            s.media.onpause = suspender; s.media.onended = suspender;
            s.media.onerror = () => { if (s.objectURL) status(s, 'O navegador não conseguiu abrir esse formato. Tente MP3, WAV ou MP4.'); };
        };
        s.configurarMedia();
        // Pesquisa de vídeos dentro do app (como no Cifra Club): a música certa, ao vivo, acústico...
        const base=(musica.titulo+' '+(musica.artista||'')).trim();
        const pesquisa=document.createElement('div');pesquisa.className='aula-busca';
        pesquisa.innerHTML='<form id="yt-pesquisa" role="search"><label for="yt-termo">Pesquisar vídeo da música</label><div class="aula-link-linha"><input id="yt-termo" class="entrada" type="search" enterkeyhint="search" value="'+esc(base)+'"><button class="bt prim" type="submit">Pesquisar</button></div><div class="aula-chips" role="group" aria-label="Tipo de vídeo"><button type="button" class="chip" data-suf="">Original</button><button type="button" class="chip" data-suf=" ao vivo">Ao vivo</button><button type="button" class="chip" data-suf=" acústico">Acústico</button><button type="button" class="chip" data-suf=" aula como tocar">Aula</button></div></form><div id="yt-resultados" class="aula-resultados" aria-live="polite"></div><details class="aula-chave"><summary>Busca não funcionou? Configurar chave do YouTube</summary><p class="dica">A pesquisa usa servidores gratuitos que às vezes ficam fora do ar. Com uma chave gratuita da YouTube Data API (restrita a este site) ela fica sempre estável.</p><input id="yt-chave" class="entrada" type="password" aria-label="Chave pública restrita da YouTube Data API"><button type="button" class="chip" id="yt-salvar-chave">Guardar chave</button></details>';
        root.querySelector('.aula-fontes').prepend(pesquisa);
        DB.lerMeta('youtube-api-key').then(key=>{if(!s.fechado)pesquisa.querySelector('#yt-chave').value=key||'';});
        pesquisa.querySelector('#yt-salvar-chave').onclick=async()=>{await DB.gravarMeta('youtube-api-key',pesquisa.querySelector('#yt-chave').value.trim());status(s,'Chave de busca guardada.');};
        const resEl=pesquisa.querySelector('#yt-resultados'), termoEl=pesquisa.querySelector('#yt-termo');
        const marcarAtivo=()=>resEl.querySelectorAll('[data-yt]').forEach(b=>b.classList.toggle('ativo',b.dataset.yt===s.musica.youtube));
        async function buscar(q){
            q=(q||'').trim();if(!q)return;
            const pedido=++s.buscaPedido;
            resEl.innerHTML='<p class="aula-busca-msg">Pesquisando vídeos…</p>';
            try{
                const lista=await pesquisarVideos(q);
                if(s.fechado||pedido!==s.buscaPedido)return;
                if(!lista.length){resEl.innerHTML='<p class="aula-busca-msg">Nenhum vídeo encontrado. Tente mudar o texto da pesquisa.</p>'+linkYouTube(q);return;}
                resEl.innerHTML=lista.map(v=>'<button type="button" class="aula-res" data-yt="'+esc(v.id)+'"><img src="https://i.ytimg.com/vi/'+esc(v.id)+'/mqdefault.jpg" width="96" height="54" loading="lazy" decoding="async" alt=""><span><b>'+esc(v.titulo)+'</b><small>'+esc(v.canal)+(v.duracao?' · '+esc(v.duracao):'')+'</small></span></button>').join('');
                resEl.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{abrirYouTube(s,b.dataset.yt).then(marcarAtivo);});
                marcarAtivo();
            }catch(erro){
                if(s.fechado||pedido!==s.buscaPedido)return;
                resEl.innerHTML='<p class="aula-busca-msg">'+esc(erro.message)+'</p>'+linkYouTube(q);
            }
        }
        pesquisa.querySelector('#yt-pesquisa').onsubmit=e=>{e.preventDefault();buscar(termoEl.value);};
        pesquisa.querySelectorAll('[data-suf]').forEach(b=>b.onclick=()=>{termoEl.value=base+b.dataset.suf;pesquisa.querySelectorAll('[data-suf]').forEach(x=>x.classList.toggle('ativo',x===b));buscar(termoEl.value);});
        s.buscaPedido=0;
        // Sem vídeo salvo nesta cifra: já mostra as opções, sem precisar digitar nada.
        if(!musica.youtube){pesquisa.querySelector('[data-suf=""]').classList.add('ativo');buscar(base);}
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
