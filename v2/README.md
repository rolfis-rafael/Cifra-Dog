# Cifra-Dog v2

## v3.8.0 — Ajuda de palco

- **Próxima música** (fim da cifra, dentro de um repertório): cartão com o que muda na troca (capo, afinação, lembrete da música, BPM) e uma faixa "Próxima" que aparece perto do fim. Botões **Lembrete** e **Ir para a próxima**.
- **Emendar músicas (medley):** no mesmo cartão, 3 caminhos de acordes para ligar uma música na outra (pela dominante, ii–V, acorde em comum). São sugestões por regra de harmonia: confira de ouvido. Toque num acorde para ver o diagrama.
- **Ordem inteligente** (repertório → ⋯): "Menos trocas" agrupa músicas com o mesmo capo e afinação; "Energia do show" sobe e desce o BPM. Cria uma NOVA ordem e mantém a atual; a 1ª e a última de cada bloco ficam no lugar.
- **Banda sincronizada** (repertório → ⋯): o líder convida pelo QR/código; quem entra acompanha a música, o tom e a rolagem do líder (a transposição vale só na tela, não altera a cifra salva). Funciona sem servidor (WebRTC), melhor na mesma Wi-Fi.
- **Modo baterista** (Ajustes da cifra): esconde os acordes, mostra a letra como deixa, quantas frases tem cada parte (e compassos, se ajustado) e o BPM grande com metrônomo visual.

## v3.7.1 — Ferramentas para o músico

- **Pacotes de músicas** (Discografia → **+**, ou banner no Início): instala pacotes de cifras livres do catálogo no GitHub Pages (`cifradog-pacotes`). Confere o arquivo (sha256), não duplica e nunca substitui uma música sua ou uma cifra que você editou. Funciona offline depois de instalado. Crédito da licença aparece no topo da cifra.
- **Editor:** "Onde achar cifras livres", botão **Arquivo** para abrir `.cho`/`.txt` (ChordPro é convertido) e campo com o link de onde veio a cifra.
- **Tom para a minha voz** (Ajustes da cifra): grave a sua extensão vocal cantando no microfone (ou escolha na lista; ♪ toca a nota) e o app sugere os 3 melhores tons. Para ficar preciso, grave a extensão da melodia de cada música; sem ela, a sugestão é uma estimativa (o app avisa).
- **Capotraste mais fácil** (Ajustes da cifra): os 3 capos com menos pestanas para o tom da tela.
- **Mandar para a banda** (repertório → ⋯): arquivo com as cifras (abre no "Compartilhar" do celular) ou QR com a lista (ordem, blocos e tons). Quem recebe salva o repertório; as músicas que já tem entram transpostas para o tom da banda.
- **Cardápio de pedidos** (repertório → ⋯): QR para o público ver as músicas do show (`cardapio.html`, sem servidor), com botão **Pedir** pelo WhatsApp. Gere o QR pelo endereço publicado, não pelo localhost.
- **Rolagem:** arrastar a cifra com o dedo não desliga mais a rolagem automática (ela espera e volta sozinha); a pinça e o deslize lento não trocam de música por acidente; segurar o dedo num acorde não abre o diagrama.

## v3.5.0 — Ícones da barra e ajustes de experiência

- **Barra de baixo com 4 abas:** Início · Pesquisar · Discografia · Show. O ícone fica só no contorno nas abas fechadas e preenchido na aba aberta.
- **"Crie" saiu da barra:** agora é o botão **+** da Discografia, que abre *Nova cifra* ou *Novo repertório* (como o "Criar" da biblioteca do Spotify).
- **Confirmação antes de apagar:** remover música do repertório, remover bloco, apagar passo da rolagem programada e tirar botão do pedal.
- **Toque mais fácil:** botões − / + dos ajustes, chaves liga/desliga e botões da doca com área de toque de pelo menos 40 px.
- **Leitura:** textos pequenos (tom no topo, tempo de show, doca, painel de vídeo) com no mínimo 11 px.
- **Modo palco no celular:** a doca não fica mais quase invisível.
- Botões de voltar com nome para leitores de tela; capotraste mostra "Sem capo".

## v3.4.0 — Barra de baixo no padrão dos apps de música

- **Mini player removido** (a barrinha "Exagerado · Cazuza" no rodapé).
- **Nova ordem da barra:** Início · Pesquisar · Discografia · Crie · Show, igual à barra lateral do computador. Início é sempre o primeiro, como no Spotify e no YouTube Music.
- **Atualização automática:** o app agora baixa os arquivos novos sem usar o cache do navegador e recarrega sozinho quando sai uma versão nova (se uma cifra estiver aberta, recarrega na próxima troca de tela).

## v3.3.0 — Topo da cifra compacto e pesquisa de vídeos

- **Topo da cifra mais enxuto:** os acordes ficam ao lado do tom original (faixa que rola para o lado); o BPM ganhou três ícones ao lado: **caderno** (Caderno e ferramentas), **microfone** (Show programado) e **vídeo** (Aprender com vídeo). Barra do repertório um pouco menor. A cifra aparece logo ao abrir.
- **Pesquisa de vídeo dentro do app:** ao abrir o painel de vídeo numa música sem vídeo salvo, as opções já aparecem (Original, Ao vivo, Acústico, Aula). Toque num resultado para assistir; ele fica salvo na cifra. Funciona sem chave por servidores gratuitos do Piped (podem ficar fora do ar). Com a chave gratuita da YouTube Data API, fica sempre estável.
- **Pitch shifter removido** do painel de vídeo (o arquivo `js/pitch-worklet.js` continua na pasta, mas não é mais usado).

## v3.2.0 — Contagem, pontinhos do tempo e karaokê com acordes

- **Karaokê (show programado):** a linha atual e a seguinte aparecem com o **acorde em cima da letra**. Novo botão Pausar/Continuar dentro do karaokê.
- **Contagem de entrada:** com BPM definido, a rolagem programada, a rolagem por BPM e o show programado tocam uns 4 cliques (um compasso; em 2/4 e 6/8, dois) com número grande 4-3-2-1 antes da primeira linha. No vídeo, a contagem cai nos 4 tempos antes da 1ª linha gravada.
- **Pontinhos do tempo:** 2, 3, 4... pontinhos no topo da tela (conforme o compasso) acendem a cada tempo; o tempo 1 é maior e laranja.
- **Rolagem programada começa da 1ª linha:** na gravação, *Começar* só arma o relógio; a 1ª marcação (pedal ou toque) é o início da 1ª linha. A introdução não vira passo. Programações gravadas antes desta versão começam uma linha adiantada: grave de novo.
- Ao concluir a gravação aparece **Rolagem Programada!**. Concluir com menos de 2 linhas não apaga mais a gravação.

## v3.1.0 — Vídeo e show programado

- O estúdio inclui pesquisa preenchida com música e artista. Com uma chave restrita da YouTube Data API, mostra até seis versões selecionáveis dentro do app; sem chave, abre a pesquisa correspondente no YouTube. O vídeo escolhido fica salvo e é reaberto na cifra. O app não afirma que a primeira gravação encontrada corresponde ao arranjo da cifra.
- Player recolhido com cerca de 224 × 240 pixels, sem cabeçalho ou enfeites. A área do YouTube mantém no mínimo 200 × 200, conforme a exigência do provedor.
- Na cifra: **Show programado → Gravar linhas com o vídeo**. Dê play antes de gravar e marque as linhas por toque ou pedal. A gravação usa o tempo do vídeo; pausas não avançam o relógio. Não volte a um ponto anterior durante a gravação; volte antes de começar ou grave novamente.
- O show usa esses tempos absolutos para seguir pausas, mudanças de velocidade e saltos do vídeo. Uma programação de outra gravação pode não corresponder à nova versão escolhida.
- Escolha cifra completa ou karaokê, com a frase atual e a seguinte. Defina o tempo final e escolha avanço automático ou manual. Próxima música na tela e a ação MIDI de próxima música continuam disponíveis.
- No repertório: **Show programado / intervalos** guarda a visualização e adiciona um intervalo como bloco antes de uma música. Intervalos escolhidos têm prioridade sobre a pausa automática de metade no modo karaokê. O aviso espera Continuar o show.
- No próximo vídeo salvo, o app prepara o player e tenta iniciar; políticas de reprodução automática do navegador podem exigir um toque em Play. Arquivos locais precisam ser selecionados no aparelho.

Referências: [API oficial de busca](https://developers.google.com/youtube/data/reference/rest/v3/search/list) e [dimensões do player](https://developers.google.com/youtube/iframe_api_reference#Requirements). A busca interna requer chave da API configurada, e o envio real ao Drive continua dependendo das credenciais OAuth do site.

## v3.0.0 — Ferramentas de estudo e segurança

Menu do avatar → **Estudo, palco e segurança**. Dentro da cifra, o botão **Caderno e ferramentas** abre as mesmas áreas com a música atual.

- Caderno com anotações, situação de estudo, duração e afinação. Fila por etapa, planejamento de repertório com intervalos, aviso de troca de capo/afinação e perfis de pedal guardados pelo usuário.
- Afinador cromático, com microfone ligado só durante o painel, referências de afinação padrão, Drop D, meio tom abaixo, Open G e DADGAD. Diagramas para canhotos; os diagramas de acordes continuam referentes à afinação padrão.
- No estúdio, abra **Trechos e treino**: marcação A–B, repetição, avanço de velocidade a cada três repetições, contagem de quatro tempos e marcadores com nomes. Usa as velocidades disponíveis da fonte.
- Histórico automático limitado a 12 versões, cópia antes de excluir/importar, exportação incluindo preferências, perfis e anotações e importação com prévia. Recuperação junta dados; letras conflitantes entram como versões recuperadas sem apagar o texto atual. Reimportar a mesma versão não duplica essa cópia.
- Google Drive: acesso privado `drive.appdata`, token somente em memória, cópias imutáveis e sincronização ao guardar alterações durante uma sessão autorizada. Exclusões de músicas são registradas para não reaparecerem em uma importação antiga. Não envia arquivos de mídia locais.

**Configuração pendente para Drive real:** criar um cliente OAuth do tipo Web no Google Cloud, habilitar a API Drive e registrar a origem do site. Informe o ID público em Segurança → Google Drive e entre na conta. A conexão de um serviço ao chat não concede acesso ao site. Nenhuma sincronização real é indicada sem autorização e envio bem-sucedidos. O fluxo foi testado com respostas simuladas; requer validação na conta configurada.

O histórico local não substitui cópia externa. Os testes usam perfis isolados; afinação em instrumentos físicos e autorização real do Google não foram atestadas nesta sessão.

## v2.9.1 — Ajuste de contraste

- Camada preta do cenário corrigida para **40%**, no celular e computador, mantendo a otimização da versão anterior.

## v2.9.0 — Contraste e otimização

- Cenário com uma camada preta de **80%** no celular e computador. Textos, capas e controles mantêm a opacidade normal.
- Sete imagens principais convertidas para WebP: **20.087.918 → 2.300.560 bytes**, redução de **88,55%**. Os PNGs originais continuam disponíveis como fontes.
- Mascote e logo dimensionados para uso real; ícones específicos de 180, 192 e 512 pixels.
- Cache offline com os recursos atuais, sem as imagens antigas. Requisições externas, como as do YouTube, seguem direto pela rede.
- A pesquisa reaproveita a análise de acordes e textos, e as contagens dos gêneros são calculadas uma vez por abertura da tela.
- Redimensionar a janela dentro do modo computador não fica repetindo consultas ao banco da barra lateral.
- Pacote para publicar com **29 arquivos de execução**, sem backups, testes ou PNGs de origem. Gere com `node tools/package-app.cjs`; o resultado fica em `output/release-v2.9.0/`.

As duas entradas, raiz e `v2/`, continuam sincronizadas. Veja as capturas e os resultados em [output/otimizacao](output/otimizacao/IMPLEMENTACAO.md).

## v2.8.1 — Dog alternativo e estúdio de aprendizado

- Logo e mascote novos em desenho, com contorno forte, bandana, guitarra, cores de pôster e textura vintage. O dog aparece em destaque no Início e tem 12 versões musicais.
- **Pesquisar:** abas de Rock, Pop, Metal, Sertanejo, MPB, Samba, Reggae, Gospel, Blues, Jazz, Forró e Funk, cada uma com sua arte. O filtro de **tom** combina com gênero e texto. O gênero pode ser escolhido em Criar/Editar → Mais opções.
- **Aprender com vídeo**, dentro da cifra: moldura de madeira de pub, link do YouTube salvo por música, controle de velocidade e cordinha que fecha ao clicar ou puxar.
- **YouTube:** recolher mantém um player compacto visível; expandir preserva o mesmo vídeo. A API não oferece pitch shifter e as regras proíbem player de fundo totalmente oculto.
- **Áudio/vídeo do aparelho:** ocultar mantém o som, o botão Voltar ao estúdio reabre o quadro e o pitch shifter transpõe de −12 a +12 semitons sem mudar a velocidade. O arquivo permanece no aparelho, sem upload. Precisa de navegador com AudioWorklet e localhost ou HTTPS para a transposição.
- Processamento carregado só ao transpor, memória fixa e suspensão ao pausar. Original usa bypass. Trocar de arquivo ou fechar libera os recursos anteriores.
- Retiradas as demonstrações originais antigas e o repertório de exemplo vazio. Cifras com letra editada são preservadas. Uma cópia de recuperação das demos removidas fica nos metadados locais.
- Raiz e `v2/` sincronizadas. Visual e áudio local funcionam offline; YouTube precisa de internet.

Veja [a nova identidade e o estúdio](output/estudio/preview.html). Detalhes, limites, testes e prompts em [output/estudio/IMPLEMENTACAO.md](output/estudio/IMPLEMENTACAO.md).

## v2.7.0 — Interface Taverna

A versão mais nova encontrada antes desta mudança era a **2.6.0 na raiz**. A pasta `v2/` estava na **2.5.0**. As duas entradas agora usam o mesmo aplicativo 2.7.0 e as mesmas funcionalidades da base 2.6.0.

- Abra pelo XAMPP em `http://localhost/Cifra-Dog-main/` ou `http://localhost/Cifra-Dog-main/v2/`.
- Visual inspirado no pub da referência: fundos originais gerados para computador e celular, capas ilustradas, couro escuro, papel envelhecido e carimbos vermelhos.
- As cinco abas têm interfaces próprias: **Crie · Discografia · Início · Pesquisar · Show**. O Início continua no centro no celular; no computador, há uma barra lateral.
- Cifra, repertórios, curtidas, configurações e painéis de ações seguem o mesmo tema. O fundo da cifra permanece discreto para leitura no palco.
- Elementos continuam interativos e acessíveis, com navegação por teclado, foco visível e botão de fechar nos painéis.
- Banco de cifras e preferências mantidos. As imagens entram no cache offline. O cache tem identificação por endereço para as duas entradas coexistirem.
- Corrigida a análise atrasada do editor depois de sair da tela.

Veja as capturas reais em [output/interface/preview.html](output/interface/preview.html). O resumo das alterações, inventário de telas e os prompts das imagens estão em [output/interface/IMPLEMENTACAO.md](output/interface/IMPLEMENTACAO.md). Uma cópia dos arquivos anteriores está em `output/interface/antes-taverna.zip`.

App de cifras sem PHP: funciona offline, no celular e no computador. Pode ser instalado como programa (PWA).

## Rodar no computador
- Pelo XAMPP (só o Apache, sem MySQL): abra `http://localhost/Cifra-Dog-main/v2/`
- No Chrome ou Edge, clique no ícone **Instalar** da barra de endereço. O Cifra-Dog vira um programa com janela própria e aparece no menu Iniciar.

## Rodar no celular
1. Suba a pasta `v2` no Netlify: arraste a pasta em app.netlify.com/drop.
2. Abra o link no Chrome do celular → menu ⋮ → **Instalar app**.
3. Depois de instalado, funciona sem internet.

> As cifras ficam salvas **no aparelho** (IndexedDB). Para passar do PC para o celular, use **Sua Biblioteca → Backup → Exportar** e depois **Importar** no outro aparelho.

## Arquivos
| Arquivo | O que faz |
|---|---|
| `index.html` | Página única do app |
| `css/app.css` | Visual preto e vermelho; no PC ganha barra lateral |
| `js/cifra-motor.js` | Motor do Cifra-Dog original: transpor, acordes, diagramas, ChordPro |
| `js/db.js` | Banco local (substitui o MySQL/PHP) |
| `js/telas.js` | Telas: Início, Buscar, Biblioteca, Criar, Cifra, Repertório |
| `js/app.js` | Rotas, mini-player, instalar, backup |
| `js/exemplos.js` | Cifras de exemplo da primeira abertura |
| `js/rolagem-bpm.js` | Rolagem por BPM |
| `js/lista-video.js` | Lista de músicas do vídeo (sem cifra) |
| `js/controle.js` | Pedal MIDI / teclas: aprender botões, ações, rolagem pelo pedal |
| `js/show-ajuda.js` | Próxima música, emendar, ordem inteligente, modo baterista |
| `js/banda.js` | Banda sincronizada (WebRTC por QR/código) |
| `sw.js` | Modo offline. Ao mudar algum arquivo, aumente a `VERSAO` |

## Mecânicas
- **Rolagem por BPM:** Ajustes da cifra → *Rolagem por BPM*. A cada tempo 1 do compasso desce uma frase, marcada com marca-texto leve. Opções: BPM, compassos por frase (padrão e por frase), clique sonoro. Toque numa frase para pular para ela; segure para mudar os compassos só dela. Lógica em `js/rolagem-bpm.js`.
  - Tempos por compasso: 4/4 = 4 · 3/4 = 3 · 2/4 = 2 · 7/4 = 7 · 6/8 = 2 · 12/8 = 4 (em 6/8 e 12/8 o BPM é o da semínima pontuada).
- **Substituir posição:** no ⋯ de uma música do repertório. Digite o nº ou escolha na lista, e as duas trocam de lugar. Arrastar pela alça também funciona.
- **Blocos:** botão *Dividir em bloco* (ou *Começar um bloco aqui* no ⋯ da música). Toque na faixa para renomear ou remover.

## Pedal (MIDI ou teclado) — ex.: M-VAVE Chocolate Plus
Menu do avatar (ou Ajustes da cifra) → **Configurações**.
- **MIDI:** ligue a chave (Chrome/Edge; precisa de https ou localhost). Toque em **+ Aprender** numa ação e pise no botão: vale PC, CC ou Nota.
- **Modo teclado** do pedal (Page Up/Down, setas, Espaço): não precisa ligar o MIDI, é só aprender.
- **Program Change sem botão definido** vai para a música nº (PC 0 = nº 1).
- **Rolagem pelo pedal:** o potenciômetro define quanto a tela anda a cada pisada (% da tela).
- Ações: próxima/anterior música, descer/subir/início da tela, rolagem, próxima/anterior frase (BPM), pesquisar no repertório, tom ±, tom original, letra ±, palco, curtir.

## Show no celular
Na cifra aberta pelo repertório: botões grandes de anterior/próxima, a próxima música aparece embaixo do nome, e tocar no nome abre a **lista do repertório com busca** (nome ou nº; Enter abre a primeira).

## Várias ordens no repertório
Linha **Ordem** no repertório: Ordem 1, + Nova (copiar a atual ou vazia) e ⋯ (organizar automaticamente, duplicar, renomear, excluir). **Organizar** ordena dentro de cada bloco por título, artista, tom, BPM, nº da lista, aleatória ou inverter — por padrão cria uma ordem nova. O modo show segue a ordem em uso.

## Backup celular ↔ PC
Exportar no aparelho de origem e Importar no outro. A importação **junta** pelo nome + artista (não duplica) e não apaga cifra já colada.

## Lista do vídeo
Na primeira abertura o app cria o repertório **Lista do vídeo** com as músicas da sua lista (sem duplicar), em 3 blocos, **sem as cifras**. Em *Sua Biblioteca → Sem cifra* elas aparecem em ordem; toque na música → *Abrir a cifra no site* → copie → *Colar a cifra*. Dados em `js/lista-video.js`.

## Atalhos no PC (tela da cifra)
Espaço = rolar/pausar · `+`/`-` = tom · ←/→ = música anterior/próxima no repertório · `P` = modo palco


## v2.3.0 — novidades
- **Pedal / MIDI:** novas ações *Parar a rolagem* e *Travar / destravar a rolagem*. Segurar por ~0,7 s o botão de descer, subir, iniciar ou parar também trava (e de novo solta). Vale para teclas, Nota e CC (Program Change não manda "solto"). Ajuste em Configurações → Rolagem pelo pedal.
- **Rolagem pelo pedal suave:** a descida é animada quadro a quadro; pisadas seguidas somam no destino.
- **Pinça:** dois dedos na cifra mudam o tamanho da letra. A rolagem automática acompanha o tamanho (letra maior = mais rápida, proporcional). A letra nunca passa do que cabe na largura da tela.
- **Pesquisa nos repertórios:** botão de lupa na tela do repertório, na faixa do show (dentro da cifra) e na aba Show (busca em todos os repertórios).
- **Novo visual "taverna"** e barra de 5 abas: Crie · Discografia · Início · Pesquisar · Show. Início com banner de novidades, "ingresso" do show, escolha por tom e mais seções.
- O modo karaokê ficou de fora de propósito.

## v2.4.0
- **Rolagem programada** (Ajustes da cifra → *Rolagem programada*): você programa qual linha desce em cada passo. Dois jeitos: *Gravar ouvindo a música* (pise o pedal ou toque na linha a cada descida; descer/subir do pedal avança/desfaz; a 1ª pisada começa) ou *Gerar pelo BPM* (escolhendo quantas linhas descem de uma vez). Depois dá para ver e ajustar o tempo de cada passo. Avanço **automático** (pelo tempo) ou **manual** (pedal ou botões da barra). Fica salva na música e entra no backup.
- Visual: fundo de jornal escurecido (com 50% de preto por cima) e cada música/repertório numa folha cinza-clara recortada, para ler melhor. Papéis sem manchas.

## v2.5.0
- Letra grande com quebra de linha por palavra (como no Cifra Club): acima do tamanho em que a linha cabe, o texto quebra e o acorde continua em cima da sua sílaba. Vale para A+/A−, pinça e pedal. Máximo 260%.

## v2.6.0
- Letra grande: palavras maiores que a linha também quebram (até 320%).
- Barra fininha de progresso do show na faixa do repertório (estimativa de ~4 min por música, com o tempo restante).
- O Tom foi para o topo da cifra; na barra de baixo entrou um botão personalizável (toque = faz a ação; segure = escolhe qual). Duas novas ações MIDI: "Fazer o que estiver no botão personalizável" e "Trocar a função do botão personalizável (próxima)".
