/* Um relógio por apresentação; vídeo e cifra compartilham a mesma linha de tempo. */
(function () {
    'use strict';
    let sessao=null,seguir=null;
    function sair(){if(!sessao)return;clearInterval(sessao.timer);sessao.karaoke?.remove();sessao.barra.remove();sessao.pausa?.remove();sessao=null;}
    async function configurarRepertorio(rep){
        const ms=Object.fromEntries((await DB.listarMusicas()).map(m=>[m.id,m]));
        const lista=rep.itens.filter(i=>i.tipo==='musica');const cfg=rep.showProgramado||{};
        UI.abrirSheet('<h3>Show programado</h3><form class="form" id="sp-config"><label>Visualização<select class="entrada" id="sp-modo"><option value="cifra">Cifra completa</option><option value="karaoke" '+(cfg.modo==='karaoke'?'selected':'')+'>Karaokê · duas linhas</option></select></label><label><input type="checkbox" id="sp-auto" '+(cfg.automatico?'checked':'')+'> Avançar no fim marcado da música</label><label><input type="checkbox" id="sp-meio" '+(cfg.pausaMetade!==false?'checked':'')+'> Avisar a metade no modo karaokê</label><label>Intervalo antes da música<select class="entrada" id="sp-intervalo"><option value="">Manter intervalos atuais</option>'+lista.map((it,i)=>'<option value="'+it.id+'">'+(i+1)+'. '+UI.esc(ms[it.musicaId]?.titulo||'Música')+'</option>').join('')+'</select></label><p class="dica">O intervalo entra como um bloco. Toque nele no repertório para renomear ou remover. Intervalos escolhidos substituem o aviso automático de metade.</p><button class="bt prim">Salvar show</button></form>',sh=>sh.querySelector('#sp-config').onsubmit=async e=>{
            e.preventDefault();const r=await DB.pegarRepertorio(rep.id);r.showProgramado={modo:sh.querySelector('#sp-modo').value,automatico:sh.querySelector('#sp-auto').checked,pausaMetade:sh.querySelector('#sp-meio').checked};
            const antes=sh.querySelector('#sp-intervalo').value;if(antes){const i=r.itens.findIndex(it=>it.id===antes);if(i>=0)r.itens.splice(i,0,{id:DB.novoId(),tipo:'bloco',nome:'Intervalo',intervalo:true});}
            await DB.salvarRepertorio(r);UI.fecharSheet();App.recarregar();UI.toast('Show programado guardado');
        });
    }
    function montar(op){
        sair();const s={...op,ativo:false,indice:-1,inicio:0,decorrido:0,timer:null,terminou:false,gravando:false};sessao=s;
        const barra=document.createElement('div');barra.className='sp-barra';barra.innerHTML='<button class="chip" id="sp-opcoes">Show programado</button><button class="chip" id="sp-toggle" hidden>Iniciar</button>';s.barra=barra;op.container.before(barra);
        const mostrarKaraoke=f=>{
            if(s.modo!=='karaoke'){s.karaoke?.remove();s.karaoke=null;return;}
            if(!s.karaoke){s.karaoke=document.createElement('section');s.karaoke.className='sp-karaoke';s.karaoke.setAttribute('aria-label','Show de duas linhas');s.karaoke.innerHTML='<small></small><div class="sp-linhas" aria-live="off"></div><div class="dupla"><button class="bt" data-sp="sair">Cifra completa</button><button class="bt prim" data-sp="proxima">Próxima música</button></div>';document.body.append(s.karaoke);s.karaoke.querySelector('[data-sp="sair"]').onclick=()=>{s.modo='cifra';mostrarKaraoke(f);};s.karaoke.querySelector('[data-sp="proxima"]').onclick=()=>avancar();}
            s.karaoke.querySelector('small').textContent=op.musica.titulo;
            const texto=n=>{const els=[...op.container.querySelectorAll('[data-frase="'+n+'"]')];const letra=els.find(el=>el.classList.contains('l-letra'));if(!letra)return Programada.resumoFrase(op.container,n);const clone=letra.cloneNode(true);clone.querySelectorAll('.rf-c').forEach(el=>el.remove());return clone.textContent.trim();};
            s.karaoke.querySelector('.sp-linhas').innerHTML='<p>'+UI.esc(texto(f))+'</p><p>'+UI.esc(op.musica.programa?.passos?.[Math.max(0,s.indice)+1]?texto(op.musica.programa.passos[Math.max(0,s.indice)+1].f):'')+'</p>';
        };
        const pausar=mensagem=>{s.ativo=false;s.esperando=false;Aprender.pausar();const aviso=document.createElement('section');aviso.className='sp-pausa';aviso.innerHTML='<h2>'+UI.esc(mensagem)+'</h2><button class="bt prim">Continuar o show</button>';document.body.append(aviso);s.pausa=aviso;aviso.querySelector('button').onclick=()=>{aviso.remove();s.pausa=null;iniciar();};};
        function iniciar(){const pg=op.musica.programa;if(!pg?.passos?.length){UI.toast('Programe as linhas primeiro, nos ajustes da cifra.');return;}if(pg.videoId && op.musica.youtube!==pg.videoId){UI.toast('Esta programação pertence a outra versão do vídeo. Selecione a versão gravada ou reprograme.');return;}if(pg.origem==='video'&&!Aprender.estado()?.tipo){UI.toast('Preparando o vídeo desta música…');s.esperando=true;Aprender.abrir(op.musica);return;}op.parar?.();const loop=document.querySelector("#tr-loop");if(loop?.checked){loop.checked=false;loop.dispatchEvent(new Event("change"));}s.esperando=false;s.iniciado=true;s.ativo=true;s.terminou=false;s.indice=-1;s.programaCache=null;s.inicio=performance.now()-s.decorrido;barra.querySelector('#sp-toggle').hidden=false;barra.querySelector('#sp-toggle').textContent='Pausar';if(pg.origem==='video')Aprender.tocar();}
        function parar(){s.decorrido=performance.now()-s.inicio;s.ativo=false;Aprender.pausar();barra.querySelector('#sp-toggle').textContent='Continuar';}
        barra.querySelector('#sp-toggle').onclick=()=>s.ativo?parar():iniciar();
        barra.querySelector('#sp-opcoes').onclick=()=>{
            const pg=op.musica.programa||{};
            UI.abrirSheet('<h3>Programar e tocar</h3><p class="dica">Dê play no vídeo e grave: toque nas linhas ou use o pedal de descer. O relógio do vídeo acompanha pausas e mudanças de velocidade.</p><button class="op" id="sp-gravar">Gravar linhas com o vídeo</button><label>Exibição<select class="entrada" id="sp-visual"><option value="cifra">Cifra completa</option><option value="karaoke" '+(s.modo==='karaoke'?'selected':'')+'>Duas linhas · karaokê</option></select></label><label>Fim da música (segundos)<input class="entrada" id="sp-fim" type="number" min="1" step="0.1" value="'+(pg.fimVideo?pg.fimVideo/1000:pg.duracao?pg.duracao/1000:'')+'"></label><button class="chip" id="sp-fim-agora">Marcar fim no tempo atual do vídeo</button><label><input type="checkbox" id="sp-automatico" '+(s.automatico?'checked':'')+'> Próxima música automaticamente no fim</label><div class="dupla"><button class="bt" id="sp-salvar">Salvar ajustes</button><button class="bt prim" id="sp-iniciar">Iniciar show</button></div><p class="dica">Sem avanço automático, use Próxima na tela ou o botão MIDI de próxima música.</p>',sh=>{
                sh.querySelector('#sp-gravar').onclick=()=>{UI.fecharSheet();if(!Aprender.estado()){Aprender.abrir(op.musica);UI.toast('Escolha o vídeo, dê play e volte a Gravar linhas.');return;}op.gravar();};
                sh.querySelector('#sp-fim-agora').onclick=()=>sh.querySelector('#sp-fim').value=Aprender.tempo().toFixed(1);
                const salvar=async()=>{s.modo=sh.querySelector('#sp-visual').value;s.automatico=sh.querySelector('#sp-automatico').checked;const fim=Number(sh.querySelector('#sp-fim').value)*1000;if(fim>0){const programa={...op.musica.programa,...(op.musica.programa?.origem==='video'?{fimVideo:fim}:{duracao:fim})};op.musica.programa=programa;await DB.atualizarMusica(op.musica.id,{programa});}if(op.rep){const r=await DB.pegarRepertorio(op.rep.id);r.showProgramado={...(r.showProgramado||{}),modo:s.modo,automatico:s.automatico};await DB.salvarRepertorio(r);}UI.fecharSheet();mostrarKaraoke(op.musica.programa?.passos?.[0]?.f||0);};
                sh.querySelector('#sp-salvar').onclick=salvar;sh.querySelector('#sp-iniciar').onclick=async()=>{await salvar();iniciar();};
            });
        };
        s.modo=op.rep?.showProgramado?.modo||'cifra';s.automatico=!!op.rep?.showProgramado?.automatico;
        s.timer=setInterval(()=>{
            if(s.esperando && Aprender.pronto()){s.esperando=false;iniciar();}
            if(!s.ativo||s.pausa||s.gravando)return;const pg=op.musica.programa;if(!pg?.passos?.length)return;
            const video=pg.origem==='video';if(video&&!Aprender.estado())return;
            const t=video?Aprender.tempo()*1000:performance.now()-s.inicio;s.decorrido=video?0:t;
            if(s.programaCache!==pg){s.programaCache=pg;let acumulado=0;s.tempos=pg.temposVideo||pg.passos.map(p=>{const t=acumulado;acumulado+=Number(p.ms)||0;return t;});}const tempos=s.tempos;let i=0;for(let k=0;k<tempos.length;k++)if(t>=tempos[k])i=k;
            if(i!==s.indice){s.indice=i;RolagemBPM.marcarFrase(op.container,pg.passos[i].f);mostrarKaraoke(pg.passos[i].f);}
            const fim=video?pg.fimVideo:pg.duracao;if(fim>0&&t>=fim&&!s.terminou){s.terminou=true;s.ativo=false;Aprender.pausar();if(s.automatico)avancar();else UI.toast('Música concluída. Toque em Próxima ou use o pedal.');}
        },100);
        s.iniciar=iniciar;s.pausar=pausar;
        if(op.rep&&op.idx>0){const atual=op.posicoes[op.idx];const prev=op.posicoes[op.idx-1];const a=op.rep.itens.findIndex(i=>i.id===prev.id),b=op.rep.itens.findIndex(i=>i.id===atual.id);const pausa=op.rep.itens.slice(a+1,b).find(i=>i.intervalo);const explicitas=op.rep.itens.some(i=>i.intervalo);if(pausa)pausar(pausa.nome||'Hora da pausa');else if(s.modo==='karaoke'&&!explicitas&&op.rep.showProgramado?.pausaMetade!==false&&op.idx===Math.ceil(op.posicoes.length/2))pausar('hora da pausa, metade do repertório já!');}
        if(seguir===op.rep?.id){seguir=null;if(!s.pausa)iniciar();}
        return sair;
    }
    function avancar(){if(!sessao?.proximo)return false;seguir=sessao.iniciado?(sessao.rep?.id||null):null;sessao.ativo=false;Aprender.pausar();sessao.proximo();return true;}
    window.ShowProgramado={montar,sair,configurarRepertorio,avancar,gravando:valor=>{if(sessao){sessao.gravando=valor;sessao.ativo=false;}},ativo:()=>!!sessao?.ativo};
})();
