# Cifra-Dog v2 — mapa da arquitetura

Resumo para consulta rápida (não substitui o código). Atualize ao mudar a estrutura.

## Arquivos
| Arquivo | Papel |
|---|---|
| `index.html` | casca: navegação (4 abas), `#tela`, `#sheet-fundo`, ordem dos scripts |
| `js/app.js` | rotas por hash (`ROTAS`), navegação, barra lateral, instalar, exportar/importar, service worker |
| `js/telas.js` | todas as telas (`Telas.inicio, buscar, biblioteca, criar, cifra, repertorio, config, show, curtidas`) e menus |
| `js/pacotes.js` | **pacotes de músicas** (catálogo no GitHub Pages, instalar sem duplicar) e tela `#/pacotes` |
| `js/voz.js` | **tom para a voz** (extensão vocal pelo microfone, `prefs().voz`; extensão da música `m.extensao`) e **capotraste mais fácil** (`sugerirCapo`); abertos pelos ajustes da cifra |
| `js/compartilhar.js` | **mandar repertório para a banda** (arquivo de backup ou QR com a lista) e **cardápio de pedidos** (QR); tela `#/receber` |
| `js/vendor/qrcode.js` | gerador de QR (qrcode-generator 2.0.4, Kazuhiko Arase, MIT) |
| `cardapio.html` | página pública do cardápio: lê a lista do próprio link (`#d=`), sem servidor; botão "Pedir" via WhatsApp |
| `js/show-ajuda.js` | **ajuda de palco** (`window.ShowAjuda`): cartão/faixa "Próxima" com avisos (capo, afinação, `m.lembrete`, BPM), **emendar** (`sugerirEmenda`), **ordem inteligente** (`abrirOrdem`: menos trocas / energia, cria NOVA ordem em `r.ordens`), **modo baterista** (`aplicarBaterista`, `barraBaterista`; `pr.baterista`) |
| `js/banda.js` | **banda sincronizada** (`window.Banda`, `Telas.banda`): WebRTC DataChannel líder↔integrantes, convite/resposta por QR ou código (sem servidor); mensagens `musica`/`pos`/`fim`; selo `#banda-selo` |
| `js/cifra-motor.js` | acordes, transposição, `renderizarCifra`, `detectarTom`, `sugerirCapo`, `chordProParaCifra`, diagramas |
| `js/db.js` | IndexedDB: stores `musicas`, `repertorios`, `meta`; exportar/importar |
| `js/filtro-json.js` | **filtro de segurança** (`window.FiltroJson`): todo JSON que entra (backup, repertório, pacote) é reconstruído só com os campos conhecidos, com tipo e tamanho limitados; tira `<script>`/HTML perigoso, links que não são http(s), `__proto__`, ajustes fora da lista (ex.: `pacotesUrl`). Roda em `DB.importar` (db.js e sala.js) e `validarPacote` (pacotes.js). Campo novo na música? Inclua em `CAMPOS_MUSICA` e em `musica()`. Teste: `node tools/verify-filtro-json.cjs` |
| `js/dicas-rolagem.js` + `css/dicas.css` | **"tem mais aqui"**: degradê + setinha acima da barra de baixo quando há conteúdo abaixo (desligado na cifra/palco/computador), largura dos cartões do carrossel ajustada para sempre aparecer ~40% do próximo, borda esmaecida nos chips, degradê no painel inferior |
| `js/ui.js` | ícones, `abrirSheet`, `toast`, `perguntar` (máx. 80 letras, vazio = cancelar), `confirmar`, `prefs`, `usuarioRolando` |
| `js/sala.js` | "Nos bastidores": afinador (microfone, autocorrelação), caderno, histórico de segurança; reescreve `App.importar` |
| `js/controle.js` | pedal MIDI / teclado, rolagem suave do pedal, trava |
| `js/rolagem-bpm.js`, `js/programada.js`, `js/show-programado.js`, `js/metronomo.js` | rolagens e show |
| `js/catalogo.js` | gêneros e artista → gênero |
| `js/aprender.js` | vídeo de estudo (YouTube/arquivo) |
| `js/lista-video.js` | importa a "Lista do vídeo" (músicas sem cifra) na primeira abertura |
| `js/exemplos.js` | só migração antiga |
| `js/pitch-worklet.js` | não usado (só está no cache) |
| `sw.js` | cache offline; **aumente `VERSAO` a cada mudança** e liste arquivos novos em `ARQUIVOS` |

## Rotas (`js/app.js` → `ROTAS`)
`#/` inicio · `#/buscar` · `#/show` · `#/biblioteca` · `#/curtidas` · `#/criar` · `#/editar/:id` · `#/config` · `#/cifra/:id` (query `rep`, `i`, `rolar`) · `#/repertorio/:id` · `#/pacotes` · `#/receber?d=` (QR da banda).
A tela pode devolver uma função de limpeza, chamada ao sair.

## Dados
- **Música:** `id, titulo, artista, tom, capo, bpm, compasso, cifra, curtida, semitons, tocadas, criadaEm, abertaEm, atualizadaEm, compassosPorFrase` + opcionais `fonte, genero, notas, etapa, duracaoMin, afinacao, marcadores, rolagemBpm, rolagemProg, programa, youtube, licenca, pacote`.
- **`cifra`:** texto puro, acordes numa linha acima da letra; seções `[Nome]`. ChordPro só é convertido ao colar no editor (`chordProParaCifra`).
- **`extensao`**: `{grave, agudo}` em MIDI (60 = C4), no tom original da música.
- **`pacote`** (músicas instaladas de pacote): `{ id, nome, revisao, musicaId, assinatura }`. A assinatura detecta se a pessoa editou a cifra (aí a atualização mantém a versão dela).
- **Repertório:** `ordens[{id,nome,itens}]`, `ativa`; `itens` espelha a ordem ativa. Item: `{id, tipo:'musica', musicaId, semitons}` ou `{id, tipo:'bloco', nome}`.
- **Meta:** `pacotes-instalados` `{id:{nome,revisao,em}}`, `pacotes-ultimo-catalogo`, histórico de segurança etc.
- **Backup:** `{app:'Cifra-Dog', versao:3, exportadoEm, musicas, repertorios, meta}`; junta por id ou título+artista.

## Pontos de encaixe
- Banners do Início: array `BANNERS` em `telas.js`.
- Menu "+" da Discografia: `data-criar-menu` em `biblioteca()`.
- Menu da música: `menuMusica`; menu do repertório: `r-menu`; item: `menuItem`.
- Ajustes da cifra: `abrirAjustes()` dentro de `cifra()` (inclui Tom para a minha voz e Capotraste mais fácil).
- Menu do repertório (`r-menu`): Mandar para a banda, Cardápio de pedidos, Ordem inteligente (`ordem-inteligente`), Banda sincronizada (`banda-sync`).
- Cifra: `?st=N` transpõe só naquela abertura (usado pela banda); `m.lembrete` = aviso exibido antes da música; cartão `#prox-card` e faixa `#prox-faixa` são desenhados por `ShowAjuda.desenharProxima` dentro de `desenhar()`.
- Cabeçalho da cifra (tom, capo, crédito da licença): `$('cifra-info').innerHTML` em `desenhar()`.

## Pacotes de músicas
- Repositório separado `cifradog-pacotes` (GitHub Pages): `catalogo.json`, `pacotes/<id>.json`, `ferramentas/gerar-catalogo.cjs`.
- Endereço: `prefs().pacotesUrl`, senão `../cifradog-pacotes/catalogo.json` em localhost, senão `https://rolfis-rafael.github.io/cifradog-pacotes/catalogo.json`.
- Formato: `cifradog.schema.json` (pacote / catálogo / backup v1).

## Links comprimidos (QR)
- `Compartilhar.empacotar(obj)` → `z` + deflate-raw em base64url (`j` + JSON se o navegador não comprimir). `cardapio.html` tem uma cópia do `desempacotar`.
- Banda: `{v:1, n, i:[[título, artista, tom] | ['#', bloco]]}`. Cardápio: `{v:1, n, w (WhatsApp), i:[[título, artista?] | ['#', bloco]]}`.
- Limite: `QR_LIMITE` 2300 caracteres (~90 músicas); aviso de QR denso acima de 1500.
- O QR usa o endereço em que o app está aberto: gere pelo endereço publicado, não pelo localhost.
