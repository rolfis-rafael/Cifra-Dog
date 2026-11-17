/* OAuth do próprio site: a conexão do chat não concede credenciais ao aplicativo. */
(function () {
    'use strict';
    let token=null, expira=0, pendente=null, timer=null;
    const api='https://www.googleapis.com/drive/v3/files';
    async function request(url, options={}) {
        if(!token || Date.now()>expira) throw new Error('Entre novamente no Google para sincronizar.');
        const response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token}});
        if(!response.ok) throw new Error(response.status===401?'A sessão Google expirou. Conecte novamente.':'O Google Drive não concluiu a operação ('+response.status+').');
        return response.status===204?null:response.json();
    }
    async function sincronizar() {
        if(pendente)return pendente;
        pendente=(async()=>{
            const list=await request(api+'?spaces=appDataFolder&q='+encodeURIComponent("name = 'cifra-dog-backup.json' and trashed = false")+'&orderBy=modifiedTime desc&pageSize=100&fields=files(id,modifiedTime),nextPageToken');
            if(list.nextPageToken)throw new Error('Há muitas versões no Drive. Exporte uma cópia e revise o histórico antes de continuar.');
            const vistos=new Set(await DB.lerMeta('drive-processados')||[]);
            for(const file of (list.files||[]).slice().reverse())if(!vistos.has(file.id)){
                const backup=await request(api+'/'+encodeURIComponent(file.id)+'?alt=media');
                await DB.importar(backup);vistos.add(file.id);
            }
            const backup=await DB.exportar();
            const boundary='cifradog_'+Date.now();
            const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:'cifra-dog-backup.json',parents:['appDataFolder']})+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(backup)+'\r\n--'+boundary+'--';
            const created=await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
            vistos.add(created.id);await DB.gravarMeta('drive-processados',[...vistos]);await DB.gravarMeta('drive-ultima',Date.now());
            // Versões imutáveis evitam sobrescrever uma edição simultânea do outro aparelho.
            for(const file of (list.files||[]).slice(11))await request(api+'/'+encodeURIComponent(file.id),{method:'DELETE'});
        })();
        try{await pendente;UI.toast('Cópia no Drive atualizada');}finally{pendente=null;}
    }
    async function conectar(clientId) {
        if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error('Informe o ID de cliente Web do Google configurado para este endereço.');
        if(!window.google?.accounts?.oauth2)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o Google.'));document.head.append(s);});
        await new Promise((resolve,reject)=>google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/drive.appdata',callback:r=>{if(r.error)return reject(new Error('O Google não autorizou a conexão.'));token=r.access_token;expira=Date.now()+Math.max(0,Number(r.expires_in)-60)*1000;resolve();},error_callback:()=>reject(new Error('A conexão foi cancelada ou bloqueada.'))}).requestAccessToken());
        await DB.gravarMeta('drive-client-id',clientId);await sincronizar();
    }
    function abrir() {
        DB.lerMeta('drive-client-id').then(id=>{
            UI.fecharSheet();UI.abrirSheet('<h3>Google Drive</h3><p class="dica">Uma cópia privada do aplicativo, com versões recuperáveis. A sincronização automática funciona enquanto o app estiver aberto, conectado e autorizado. Áudio e vídeo locais não são enviados.</p><details class="mais"><summary>Configurar a conexão do site</summary><p class="dica">É necessário um cliente OAuth Web no Google Cloud, com o endereço deste site em Origens JavaScript autorizadas e acesso à API Google Drive. Nenhuma chave secreta é usada no navegador.</p><a class="chip" target="_blank" rel="noopener" href="https://console.cloud.google.com/apis/credentials">Abrir configuração do Google ↗</a></details><label for="drive-id">ID de cliente Web</label><input class="entrada" id="drive-id" value="'+UI.esc(id||'')+'" placeholder="…apps.googleusercontent.com"><div class="dupla"><button class="bt prim" id="drive-connect">Entrar com Google</button><button class="bt" id="drive-sync" '+(!token?'disabled':'')+'>Sincronizar agora</button></div><button class="bt" id="drive-out">Desconectar neste aparelho</button><p class="dica" id="drive-status" role="status">'+(token?'Sessão autorizada':'Nenhuma sessão autorizada')+'</p>',sh=>{
                const executar=async fn=>{try{await fn();sh.querySelector('#drive-status').textContent='Cópia externa atualizada';sh.querySelector('#drive-sync').disabled=false;}catch(e){sh.querySelector('#drive-status').textContent=e.message;}};
                sh.querySelector('#drive-connect').onclick=()=>executar(()=>conectar(sh.querySelector('#drive-id').value.trim()));sh.querySelector('#drive-sync').onclick=()=>executar(sincronizar);sh.querySelector('#drive-out').onclick=()=>{token=null;expira=0;clearTimeout(timer);abrir();};
            });
        });
    }
    function agendar(){if(!token||Date.now()>expira)return;clearTimeout(timer);timer=setTimeout(()=>sincronizar().catch(e=>UI.toast(e.message)),10000);}
    window.addEventListener('online',agendar);
    window.DriveBackup={abrir,agendar,sincronizar};
})();
