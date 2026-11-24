/* Recursos opcionais em painéis; nenhum microfone ou temporizador fica ativo ao sair. */
(function () {
    'use strict';
    const { esc, abrirSheet, fecharSheet, toast } = UI;
    let timer, fila = Promise.resolve(), restaurando = false;
    const exportarBase = DB.exportar.bind(DB), importarBase = DB.importar.bind(DB);
    async function dados() { return Object.assign(await exportarBase(), { ajustes: UI.prefs(), pedal: Controle.cfg(), perfis: await DB.lerMeta('perfis-pedal') || {}, exclusoes: await DB.lerMeta('exclusoes-sala') || {}, formatoSala: 1 }); }
    DB.exportar = dados;
    async function guardar(motivo) {
        const backup = await dados();
        const historico = await DB.lerMeta('historico-seguranca') || [];
        const assinatura = JSON.stringify([backup.musicas, backup.repertorios, backup.ajustes, backup.pedal, backup.perfis,backup.exclusoes]);
        if (historico[0] && JSON.stringify([historico[0].backup.musicas,historico[0].backup.repertorios,historico[0].backup.ajustes,historico[0].backup.pedal,historico[0].backup.perfis,historico[0].backup.exclusoes])===assinatura) return;
        historico.forEach(v=>delete v.assinatura);
        historico.unshift({ id: DB.novoId(), data: Date.now(), motivo, backup });
        window.DriveBackup?.agendar();
        await DB.gravarMeta('historico-seguranca', historico.slice(0, 12));
    }
    function agendar() { clearTimeout(timer); timer = setTimeout(() => { fila = fila.then(() => guardar('Salvamento automático')).catch(() => toast('Não foi possível guardar o histórico. Exporte uma cópia.')); }, 1200); }
    for (const nome of ['salvarMusica', 'salvarRepertorio', 'excluirMusica', 'excluirRepertorio']) {
        const base = DB[nome].bind(DB);
        DB[nome] = async (...args) => {
            if (!restaurando && nome.startsWith('excluir')) await proteger('Antes de excluir');
            if (!restaurando && (nome === 'excluirMusica' || nome === 'excluirRepertorio')) { const excluidas=await DB.lerMeta('exclusoes-sala')||{}; excluidas[(nome==='excluirRepertorio'?'rep:':'')+args[0]]=Date.now(); await DB.gravarMeta('exclusoes-sala',excluidas); }
            if(nome==='salvarRepertorio') args[0]={...args[0],atualizadaEm:Date.now()};
            const result = await base(...args); if (!restaurando) agendar(); return result;
        };
    }
    const atualizar = DB.atualizarMusica.bind(DB);
    DB.atualizarMusica = async (id, campos) => { const importante=Object.keys(campos).some(k=>!['abertaEm','tocadas'].includes(k)); const r=await atualizar(id,importante?{...campos,atualizadaEm:Date.now()}:campos);if(importante)agendar();return r; };
    async function proteger(motivo) { fila = fila.catch(() => {}).then(() => guardar(motivo)); await fila; }
    DB.importar = async backup => {
        backup = FiltroJson.backup(backup).dados;   // filtro de segurança (js/filtro-json.js): antes de qualquer outra coisa, inclusive ajustes/pedal/perfis
        if (!backup || !Array.isArray(backup.musicas) || !Array.isArray(backup.repertorios || [])) throw new Error('Backup inválido');
        if(!backup.musicas.every(m=>m&&typeof m.id==='string'&&typeof m.titulo==='string'&&typeof m.cifra==='string') || !(backup.repertorios||[]).every(r=>r&&typeof r.id==='string'&&typeof r.nome==='string'&&(!r.itens||Array.isArray(r.itens)))) throw new Error('Backup com registros inválidos');
        await proteger('Antes de importar');
        // Preserva edições divergentes como cópias, em vez de sobrescrevê-las silenciosamente.
        const locais = await DB.listarMusicas();
        backup = JSON.parse(JSON.stringify(backup));
        const remap = new Map();
        const exclusoes = await DB.lerMeta('exclusoes-sala') || {};
        for(const [id,data] of Object.entries(backup.exclusoes||{})) if(Number.isFinite(data)) exclusoes[id]=Math.max(exclusoes[id]||0,data);
        backup.musicas=backup.musicas.filter(m=>!exclusoes[m.id] || (m.atualizadaEm||0)>exclusoes[m.id]);
        backup.repertorios=(backup.repertorios||[]).filter(r=>!exclusoes['rep:'+r.id] || (r.atualizadaEm||r.criadoEm||0)>exclusoes['rep:'+r.id]);
        for(const r of await DB.listarRepertorios()) if(exclusoes['rep:'+r.id] && exclusoes['rep:'+r.id]>=(r.atualizadaEm||r.criadoEm||0)){restaurando=true;try{await DB.excluirRepertorio(r.id);}finally{restaurando=false;}}
        await DB.gravarMeta('exclusoes-sala',exclusoes);
        for(const local of locais) if(exclusoes[local.id] && exclusoes[local.id]>=(local.atualizadaEm||0)) { restaurando=true;try{await DB.excluirMusica(local.id);}finally{restaurando=false;} }
        for (const entrada of backup.musicas) {
            const local = locais.find(m => m.id === entrada.id || (UI.normal(m.titulo) === UI.normal(entrada.titulo) && UI.normal(m.artista) === UI.normal(entrada.artista)));
            if (local?.cifra?.trim() && entrada.cifra?.trim() && local.cifra !== entrada.cifra) {
                const copia = locais.find(m => m.artista === entrada.artista && m.cifra === entrada.cifra && m.titulo.startsWith(entrada.titulo));
                const antes = entrada.id;
                entrada.id = copia?.id || DB.novoId();
                entrada.titulo = copia?.titulo || entrada.titulo + ' (versão recuperada)';
                remap.set(antes, entrada.id);
            }
        }
        for (const rep of backup.repertorios || []) for (const itens of [rep.itens || [], ...(rep.ordens || []).map(o=>o.itens || [])]) for (const item of itens) if(remap.has(item.musicaId)) item.musicaId=remap.get(item.musicaId);
        const resultado = await importarBase(backup);
        if (backup.ajustes && typeof backup.ajustes === 'object') UI.salvarPrefs(backup.ajustes);
        if (backup.pedal && typeof backup.pedal === 'object') Controle.salvarCfg(backup.pedal);
        if (backup.perfis && typeof backup.perfis === 'object') await DB.gravarMeta('perfis-pedal', backup.perfis);
        agendar(); return resultado;
    };
    const botao = (id, texto) => '<button class="bt" id="' + id + '">' + texto + '</button>';
    function painel(titulo, html, montar, sair) { fecharSheet(); return abrirSheet('<h3>' + esc(titulo) + '</h3><div class="sala-corpo">' + html + '</div>', montar, sair); }
    async function abrir(musica) {
        const ms = await DB.listarMusicas();
        painel('Nos bastidores', '<p class="dica">Abra só o que precisar para este ensaio.</p><div class="sala-grade">' + botao('s-estudo', 'Estudo e anotações') + botao('s-fila', 'Fila de ensaio') + botao('s-palco', 'Planejar repertório') + botao('s-pedal', 'Perfis de pedal') + botao('s-afinador', 'Afinador') + botao('s-seguranca', 'Segurança e backup') + '</div>', sh => {
            sh.querySelector('#s-estudo').onclick = () => estudo(musica || ms[0]);
            sh.querySelector('#s-fila').onclick = () => filaEnsaio(ms);
            sh.querySelector('#s-palco').onclick = palco;
            sh.querySelector('#s-pedal').onclick = perfis;
            sh.querySelector('#s-afinador').onclick = afinador;
            sh.querySelector('#s-seguranca').onclick = seguranca;
        });
    }
    function estudo(m) {
        if (!m) { toast('Adicione uma música primeiro'); return; }
        painel('Caderno de estudo', '<p><b>' + esc(m.titulo) + '</b></p><form class="form" id="s-notas"><label for="s-texto">Anotações, dedilhados e entradas</label><textarea class="entrada" id="s-texto" style="min-height:140px;white-space:pre-wrap">' + esc(m.notas || '') + '</textarea><label for="s-etapa">Situação no ensaio</label><select class="entrada" id="s-etapa">' + [['aprendendo','Aprendendo'],['revisar','Precisa revisar'],['pronta','Pronta para o palco']].map(([v,t]) => '<option value="'+v+'"'+(m.etapa===v?' selected':'')+'>'+t+'</option>').join('') + '</select><div class="dupla"><div><label for="s-duracao">Duração (minutos)</label><input class="entrada" id="s-duracao" type="number" min="0" max="120" step="0.1" value="'+(m.duracaoMin || 4)+'"></div><div><label for="s-afinacao">Afinação</label><select class="entrada" id="s-afinacao">'+['Padrão','Drop D','Meio tom abaixo','Open G','DADGAD'].map(t=>'<option'+(m.afinacao===t?' selected':'')+'>'+t+'</option>').join('')+'</select></div></div><label><input type="checkbox" id="s-canhoto" '+(UI.prefs().canhoto?'checked':'')+'> Diagramas para canhoto</label><p class="dica">Os diagramas de acordes são para afinação padrão. Em outra afinação, consulte as posições específicas.</p><button class="bt prim">Salvar caderno</button></form>', sh => {
            sh.querySelector('#s-notas').onsubmit = async e => { e.preventDefault(); await DB.atualizarMusica(m.id, { notas: sh.querySelector('#s-texto').value, etapa: sh.querySelector('#s-etapa').value, duracaoMin: Math.max(0, Math.min(120, Number(sh.querySelector('#s-duracao').value) || 0)), afinacao: sh.querySelector('#s-afinacao').value }); UI.salvarPrefs({canhoto: sh.querySelector('#s-canhoto').checked}); document.body.classList.toggle('canhoto', UI.prefs().canhoto); fecharSheet(); toast('Caderno salvo'); };
        });
    }
    function filaEnsaio(ms) {
        painel('Fila de ensaio', '<div class="chips">'+['aprendendo','revisar','pronta'].map((v,i)=>'<button class="chip" data-etapa="'+v+'">'+['Aprendendo','Revisar','Prontas'][i]+'</button>').join('')+'</div><div id="s-musicas"></div>', sh => {
            const desenhar = etapa => { sh.querySelector('#s-musicas').innerHTML = ms.filter(m=>(m.etapa||'aprendendo')===etapa).map(m=>'<a class="op" href="#/cifra/'+m.id+'">'+esc(m.titulo)+' <small>'+esc(m.artista)+'</small></a>').join('') || '<p class="dica">Nenhuma música nesta etapa.</p>'; };
            sh.querySelectorAll('[data-etapa]').forEach(b=>b.onclick=()=>desenhar(b.dataset.etapa)); desenhar('aprendendo');
        });
    }
    async function palco() {
        const reps=await DB.listarRepertorios(), ms=Object.fromEntries((await DB.listarMusicas()).map(m=>[m.id,m]));
        painel('Tempo de palco', '<label for="s-rep">Repertório</label><select class="entrada" id="s-rep">'+reps.map(r=>'<option value="'+r.id+'">'+esc(r.nome)+'</option>').join('')+'</select><label for="s-pausa">Intervalo entre músicas (segundos)</label><input class="entrada" type="number" min="0" max="600" id="s-pausa" value="20"><div id="s-tempo"></div>',sh=>{
            const calcular=()=>{const r=reps.find(r=>r.id===sh.querySelector('#s-rep').value);const lista=(r?.itens||[]).filter(i=>i.tipo==='musica'&&ms[i.musicaId]).map(i=>ms[i.musicaId]);const total=lista.reduce((s,m)=>s+(Number(m.duracaoMin)||4)*60,0)+Math.max(0,lista.length-1)*Math.max(0,Math.min(600,Number(sh.querySelector('#s-pausa').value)||0));sh.querySelector('#s-tempo').innerHTML='<h2>'+Math.floor(total/60)+' min '+Math.round(total%60)+' s</h2><p class="dica">'+lista.length+' músicas. '+lista.filter(m=>!m.duracaoMin).length+' usam estimativa de 4 minutos. Defina a duração no caderno de cada música.</p>';}; sh.querySelector('#s-rep').onchange=calcular;sh.querySelector('#s-pausa').oninput=calcular;calcular();
        });
    }
    async function perfis() {
        const p=await DB.lerMeta('perfis-pedal')||{};
        painel('Perfis de pedal', '<p class="dica">Guarde os botões atuais em um perfil. Ativar substitui o mapa em uso.</p>'+['Estudo','Vídeo','Palco'].map(n=>'<div class="ajuste"><b>'+n+'</b><div class="dupla"><button class="chip" data-salvar="'+n+'">Guardar atual</button><button class="chip" data-usar="'+n+'" '+(!p[n]?'disabled':'')+'>Ativar</button></div></div>').join(''),sh=>{
            sh.querySelectorAll('[data-salvar]').forEach(b=>b.onclick=async()=>{p[b.dataset.salvar]=JSON.parse(JSON.stringify(Controle.cfg()));await DB.gravarMeta('perfis-pedal',p);agendar();toast('Perfil guardado');perfis();});
            sh.querySelectorAll('[data-usar]').forEach(b=>b.onclick=()=>{Controle.salvarCfg(p[b.dataset.usar]);toast('Perfil '+b.dataset.usar+' ativado');});
        });
    }
    async function seguranca() {
        const h=await DB.lerMeta('historico-seguranca')||[];
        painel('Segurança e backup', '<p class="dica">Histórico automático: até 12 versões neste aparelho. Uma cópia fora do navegador protege contra perda do aparelho ou limpeza dos dados.</p><div class="sala-grade">'+botao('s-agora','Guardar versão agora')+botao('s-export','Exportar arquivo')+botao('s-import','Importar com prévia')+botao('s-drive','Google Drive')+'</div><details class="mais"><summary>Sincronização entre aparelhos</summary><p class="dica">Use Google Drive para configurar o acesso do site e entrar na sua conta. O status só indica sincronização depois de enviar a cópia com sucesso. Áudios e vídeos locais não entram no backup.</p></details><h4>Versões recuperáveis</h4>'+h.map((v,i)=>'<button class="op" data-restaurar="'+i+'">'+esc(new Date(v.data).toLocaleString('pt-BR'))+' · '+esc(v.motivo)+'</button>').join(''),sh=>{
            sh.querySelector('#s-agora').onclick=async()=>{await proteger('Versão manual');seguranca();};
            sh.querySelector('#s-export').onclick=()=>App.exportar();
            sh.querySelector('#s-import').onclick=importar;sh.querySelector('#s-drive').onclick=()=>DriveBackup.abrir();
            sh.querySelectorAll('[data-restaurar]').forEach(b=>b.onclick=()=>previa(h[Number(b.dataset.restaurar)].backup));
        });
    }
    function importar() { const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files[0];if(file){FiltroJson.zerarRelatorio();previa(await FiltroJson.lerArquivo(file));}}catch(e){toast(e.message||'Não consegui ler esse backup');}};input.click(); }
    async function recuperarExcluidas(backup) {
        const copia=JSON.parse(JSON.stringify(backup)),excluidas=await DB.lerMeta('exclusoes-sala')||{},ids=new Map();
        for(const m of copia.musicas)if(excluidas[m.id] && (m.atualizadaEm||0)<=excluidas[m.id]){const antes=m.id;m.id=DB.novoId();m.atualizadaEm=Date.now();ids.set(antes,m.id);}
        for(const r of copia.repertorios||[]) { if(excluidas['rep:'+r.id] && (r.atualizadaEm||r.criadoEm||0)<=excluidas['rep:'+r.id]){r.id=DB.novoId();r.atualizadaEm=Date.now();} }
        for(const r of copia.repertorios||[])for(const itens of [r.itens||[],...(r.ordens||[]).map(o=>o.itens||[])])for(const i of itens)if(ids.has(i.musicaId))i.musicaId=ids.get(i.musicaId);
        return copia;
    }
    function previa(backup) {
        if(!Array.isArray(backup?.musicas)||!Array.isArray(backup.repertorios||[])){toast('Backup inválido');return;}
        painel('Conferir recuperação','<p>'+backup.musicas.length+' cifras · '+(backup.repertorios||[]).length+' repertórios</p><p class="dica">A recuperação junta os dados. Letras diferentes são preservadas como versões separadas; a coleção atual recebe uma cópia de segurança antes de importar.</p><label><input type="checkbox" id="s-recuperar-excluidas" checked> Incluir músicas e repertórios excluídos como novas cópias</label>'+botao('s-confirmar','Juntar e recuperar'),sh=>sh.querySelector('#s-confirmar').onclick=async e=>{e.target.disabled=true;try{await DB.importar(sh.querySelector('#s-recuperar-excluidas').checked?await recuperarExcluidas(backup):backup);fecharSheet();toast('Backup recuperado'+FiltroJson.resumo());App.recarregar();}catch{toast('Falha ao recuperar. Seu histórico foi mantido.');e.target.disabled=false;}});
    }
    async function afinador() {
        let stream,ctx,raf,fechado=false;
        const sh=painel('Afinador','<p class="dica">Toque uma corda por vez. O microfone só funciona enquanto este painel estiver aberto.</p><select class="entrada" id="s-alvo">'+[['Padrão','E A D G B E'],['Drop D','D A D G B E'],['Meio tom abaixo','D♯ G♯ C♯ F♯ A♯ D♯'],['Open G','D G D G B D'],['DADGAD','D A D G A D']].map(([n,t])=>'<option>'+n+' · '+t+'</option>').join('')+'</select><output id="s-nota" class="sala-nota">—</output><p id="s-cents" role="status">Microfone desligado</p>'+botao('s-mic','Ligar microfone'),el=>el.querySelector('#s-mic').onclick=async e=>{
            e.target.disabled=true;
            try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(fechado){stream.getTracks().forEach(t=>t.stop());return;}ctx=new AudioContext();await ctx.resume();const analyser=ctx.createAnalyser();analyser.fftSize=2048;ctx.createMediaStreamSource(stream).connect(analyser);const data=new Float32Array(2048);let last=0;
                const tick=t=>{if(fechado)return;if(t-last>100){last=t;analyser.getFloatTimeDomainData(data);let rms=0;for(const v of data)rms+=v*v;if(rms/data.length>.00003){let best=0,lag=0;for(let d=Math.floor(ctx.sampleRate/1200);d<Math.min(1000,ctx.sampleRate/60);d++){let dot=0,a=0,b=0;for(let i=0;i<1024;i++){dot+=data[i]*data[i+d];a+=data[i]**2;b+=data[i+d]**2;}const score=dot/Math.sqrt(a*b||1);if(score>best){best=score;lag=d;}if(best>.96&&score<best-.02)break;}if(lag&&best>.8){const midi=69+12*Math.log2(ctx.sampleRate/lag/440),note=Math.round(midi);sh.querySelector('#s-nota').textContent=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][(note%12+12)%12]+(Math.floor(note/12)-1);sh.querySelector('#s-cents').textContent=Math.round((midi-note)*100)+' cents · A4 = 440 Hz';}}else{sh.querySelector('#s-nota').textContent='—';sh.querySelector('#s-cents').textContent='Toque uma corda';}}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
            }catch{stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});sh.querySelector('#s-cents').textContent='Microfone indisponível. Use HTTPS ou localhost e permita o acesso.';e.target.disabled=false;}
        },()=>{fechado=true;cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});});
    }
    // Único acesso contextual na cifra; o menu do avatar contém a área geral.
    new MutationObserver(()=>{const icones=document.querySelector('#ci-icones');if(icones&&!document.querySelector('#sala-contexto')){const b=document.createElement('button');b.id='sala-contexto';b.className='ci-ic';b.setAttribute('aria-label','Caderno e ferramentas');b.title='Caderno e ferramentas';b.innerHTML='<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M12.5 8h4M12.5 12h4M3 7h3M3 12h3M3 17h3"/></svg>';b.onclick=async()=>{const id=location.hash.match(/cifra\/([\w-]+)/)?.[1];abrir(id?await DB.pegarMusica(id):null);};icones.prepend(b);}}).observe(document.querySelector('#tela'),{childList:true});
    document.body.classList.toggle('canhoto',!!UI.prefs().canhoto);
    window.Sala={abrir,guardar:()=>proteger('Versão manual'),importar};
    App.importar = importar;
    let estudoAtual=null;
    new MutationObserver(()=>{
        if(estudoAtual&&!estudoAtual.root.isConnected){clearInterval(estudoAtual.loop);clearInterval(estudoAtual.contagem);estudoAtual=null;}
        const root=document.querySelector('#aula-panel');if(!root||root.querySelector('#treino-extra'))return;
        const bloco=document.createElement('details');bloco.className='mais';bloco.id='treino-extra';
        bloco.innerHTML='<summary>Trechos e treino</summary><div class="sala-corpo"><div class="dupla">'+botao('tr-a','Marcar início A')+botao('tr-b','Marcar fim B')+'</div><output id="tr-faixa">Escolha um trecho de pelo menos 1 segundo.</output><label><input type="checkbox" id="tr-loop"> Repetir A–B</label><label><input type="checkbox" id="tr-progressivo"> Subir velocidade a cada 3 repetições</label><div class="dupla"><label>BPM da contagem<input class="entrada" id="tr-bpm" type="number" min="30" max="240" value="90"></label>'+botao('tr-contar','Contar 4 e tocar')+'</div><output id="tr-contagem" role="status"></output>'+botao('tr-marca','Salvar marcador aqui')+'<div id="tr-marcas"></div></div>';
        root.querySelector('.aula-corpo').append(bloco);
        const s={root,a:null,b:null,loop:null,contagem:null,repeticoes:0};estudoAtual=s;
        const reset=()=>{clearInterval(s.loop);clearInterval(s.contagem);s.a=null;s.b=null;bloco.querySelector('#tr-loop').checked=false;};root.addEventListener('submit',reset);root.querySelector('#aula-file').addEventListener('change',reset);
        const id=location.hash.match(/cifra\/([\w-]+)/)?.[1];
        const rotulo=()=>bloco.querySelector('#tr-faixa').textContent='A: '+(s.a===null?'—':s.a.toFixed(1)+' s')+' · B: '+(s.b===null?'—':s.b.toFixed(1)+' s');
        bloco.querySelector('#tr-a').onclick=()=>{s.a=Aprender.tempo();rotulo();};bloco.querySelector('#tr-b').onclick=()=>{s.b=Aprender.tempo();rotulo();};
        bloco.querySelector('#tr-loop').onchange=e=>{clearInterval(s.loop);s.repeticoes=0;if(!e.target.checked)return;if(s.a===null||s.b===null||s.b-s.a<1){e.target.checked=false;toast('Marque A e B com pelo menos 1 segundo entre eles');return;}Aprender.irPara(s.a);Aprender.tocar();s.loop=setInterval(()=>{if(Aprender.tempo()>=s.b){Aprender.irPara(s.a);s.repeticoes++;if(s.repeticoes%3===0&&bloco.querySelector('#tr-progressivo').checked){const select=root.querySelector('#aula-velocidade'),opts=[...select.options].map(o=>Number(o.value)).sort((a,b)=>a-b),next=opts.find(v=>v>Number(select.value));if(next){select.value=String(next);select.dispatchEvent(new Event('change'));}}}},150);};
        bloco.querySelector('#tr-contar').onclick=()=>{clearInterval(s.contagem);let n=4;const output=bloco.querySelector('#tr-contagem');Aprender.pausar();output.textContent='4';s.contagem=setInterval(()=>{n--;output.textContent=n>0?String(n):'Vai!';if(n<=0){clearInterval(s.contagem);Aprender.tocar();}},60000/Math.max(30,Math.min(240,Number(bloco.querySelector('#tr-bpm').value)||90)));};
        const marcas=async()=>{const m=await DB.pegarMusica(id);if(!root.isConnected)return;bloco.querySelector('#tr-marcas').innerHTML=(m?.marcadores||[]).map((v,i)=>'<div class="ajuste"><button class="chip" data-tempo="'+Number(v.tempo)+'">'+esc(v.nome)+' · '+Number(v.tempo).toFixed(0)+'s</button><button class="bt-icone" data-apagar="'+i+'" aria-label="Excluir marcador">×</button></div>').join('');bloco.querySelectorAll('[data-tempo]').forEach(b=>b.onclick=()=>Aprender.irPara(Number(b.dataset.tempo)));bloco.querySelectorAll('[data-apagar]').forEach(b=>b.onclick=async()=>{const novo=await DB.pegarMusica(id);novo.marcadores.splice(Number(b.dataset.apagar),1);await DB.atualizarMusica(id,{marcadores:novo.marcadores});marcas();});};
        bloco.querySelector('#tr-marca').onclick=async()=>{const tempo=Aprender.tempo();const nome=await UI.perguntar('Nome do marcador','Refrão','Salvar');if(!nome)return;const m=await DB.pegarMusica(id);if(!m)return;await DB.atualizarMusica(id,{marcadores:[...(m.marcadores||[]),{nome,tempo}]});marcas();};marcas();
    }).observe(document.body,{childList:true});
    const estilo=document.createElement('style');estilo.textContent='.sala-corpo{display:grid;gap:14px}.sala-grade{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sala-grade .bt{font-size:13px;border-radius:8px}.sala-nota{display:block;text-align:center;font-size:64px;color:var(--ambar)}#sala-contexto{margin:0 0 16px;font-size:12px}body.canhoto .diagrama{transform:scaleX(-1)}body.canhoto .diagrama text{transform:scaleX(-1);transform-box:fill-box;transform-origin:center}';document.head.append(estilo);
})();
