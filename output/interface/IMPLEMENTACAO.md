# Cifra-Dog 2.7.0 — Taverna

## Base verificada

A raiz continha a versão 2.6.0, identificada no Service Worker e nas funcionalidades documentadas: quebra de palavras longas, tom no topo, botão personalizável e progresso do show. A pasta `v2` continha 2.5.0. Os arquivos JavaScript da raiz foram usados como base; as duas entradas agora estão sincronizadas em 2.7.0. Os arquivos PHP pertencem à aplicação antiga, anterior à versão offline, e não são as páginas usadas pelo aplicativo atual.

Não foram importados os backups pessoais existentes na pasta nem alterado o esquema do IndexedDB, o nome do banco ou as chaves das preferências. A verificação de uso executa em perfil novo e isolado.

## Telas analisadas e implementadas

| Acesso | Interface |
| --- | --- |
| Início `#/` | Filtros, apresentação, atalhos com capas, ingresso do repertório, carrosséis e recursos do app |
| Crie `#/criar` e editar `#/editar/ID` | Apresentação, nome e artista com rótulos, escrita clara, colar, prévia, tom/BPM/capo e salvar |
| Discografia `#/biblioteca` | Apresentação da coleção, repertórios, cifras, pendentes, curtidas, ordenação e backup |
| Pesquisar `#/buscar` | Busca em músicas/artistas/letra/acordes e cartões por tom |
| Show `#/show` | Apresentação, continuar show, busca em repertórios, cartões de repertório e pedal |
| Cifra `#/cifra/ID` | Contraste constante, transposição, acordes, diagramas e controles de leitura |
| Cifra no show `#/cifra/ID?rep=ID&i=N` | Contexto de show, anterior/próxima, busca no repertório e progresso |
| Repertório `#/repertorio/ID` | Capa, ações, busca, ordens, blocos e músicas organizáveis |
| Curtidas `#/curtidas` | Capa de coração e lista de favoritas |
| Configurações `#/config` | Apresentação, pedal/MIDI, rolagem e atalhos |
| Painéis | Menus, ajustes, diagramas, criar repertório e confirmações com botão de fechar e foco contido |

## Composição e arquivos

O CSS de composição é `css/taverna.css`, carregado após a folha original para conservar as regras funcionais de rolagem, cifras, gestos e palco. `js/ui.js` aplica capas por coordenadas no atlas de imagens, sem recortes adicionais. Textos, cifras e controles são HTML; as imagens fornecem apenas os materiais e a ambientação.

Os fundos são diferentes para celular e computador. A navegação inferior mantém cinco abas de mesma largura e Início na terceira posição; a partir de 900 pixels, usa a barra lateral. Há ajustes adicionais para 320–420 pixels e tablets. Cifras permanecem com contraste constante e sem o cenário atrás da leitura.

`sw.js` inclui os novos arquivos e isola os caches pela URL de registro. Não apaga caches de outros aplicativos. A pasta `v2` contém as mesmas versões de HTML, CSS, JavaScript, manifesto e imagens do tema.

## Imagens e prompts

Geradas com a ferramenta nativa de geração de imagens e copiadas para `img/taverna/` e `v2/img/taverna/`. Não há dependência de arquivos temporários ou URLs externas.

### `pub-background.png`

Use case: stylized-concept. Asset type: production website background, landscape 1536x1024 or larger. Create a highly detailed atmospheric empty vintage British music pub interior for a Brazilian guitar chord app, matching a tactile old pub collage aesthetic: dark mahogany paneled walls, rich worn wood, warm amber Tiffany stained-glass pendant lamp at upper right, vintage framed prints and a small distressed Union Jack at right, an acoustic guitar leaning at far left edge, burgundy leather booth and round dark wooden pub table at far right bottom. Deep brown, tobacco, amber and oxblood red palette. Photoreal painterly editorial quality with beautiful real wood grain, aged surfaces and cinematic warm light. Composition: most decorative objects kept to outer left and right fifths; wide middle 60% intentionally very dark quiet empty wood wall for readable website content. No people, no words, no lettering, no user interface, no logos, no watermark. Single uninterrupted background image filling the canvas. Detailed textured vintage warm authentic pub rather than flat vector illustration. Will be used fixed behind live HTML interface on mobile and desktop.

### `covers-atlas.png`

Use case: stylized-concept. Asset type: six square vintage music cover artworks in a single 3 column by 2 row sprite atlas, full bleed, landscape canvas 1536x1024. Exactly six equally sized square panels, aligned edge-to-edge with no gaps, no frame around whole image. Consistent authentic weathered album sleeve printmaking collage aesthetic for an old mahogany music pub interface. TOP LEFT: large hand drawn dark red heart on stained cream paper, faded red background. TOP MIDDLE: black vinyl record with oxblood center label on aged tan parchment. TOP RIGHT: illustrated acoustic guitar on muted antique teal and tan paper collage. BOTTOM LEFT: brass vintage microphone with dramatic burgundy backdrop and gold scratches. BOTTOM MIDDLE: golden butterfly black ink on old cream paper with burgundy edges. BOTTOM RIGHT: worn Union Jack distressed flag print in faded navy, burgundy and cream. Rich analog paper grain, scuffed ink, authentic torn poster collage textures, attractive strong simple centered motifs readable at thumbnail size. Artworks only. No text, no letters, no numbers, no user interface, no watermarks. Each panel's main subject centered inside its own square. All six panels same dimensions and completely filled.

### `materials-atlas.png`

Use case: stylized-concept. Asset type: production UI material texture atlas, square image, exactly 2 columns and 2 rows of four equally sized square textures, edge to edge no margins no gaps. Top left quadrant: light warm aged cream parchment paper, fine realistic paper fibers and softly worn edge coloration, quiet even center, no stains in center, suitable under black text. Top right quadrant: very dark brown almost black vintage bookbinding leather with finely scuffed grain and subtly distressed gold flecks only near edges, suitable under white text. Bottom left quadrant: deep oxblood red worn screenprinted ink paint on paper, richly textured slightly uneven red, brighter scuffed warm red near edges, suitable under white text. Bottom right quadrant: aged honey tan parchment with softly faded antique engraved ornamental lines toward edges, quiet light tan center. This is a pure flat material sample sheet for a vintage music pub website, no depicted objects, no perspective, no typography, no symbols, no logos, no watermarks, no frames, no borders, no shadows. Beautiful realistic tactile texture with fine subtle detail. Quadrants meet exactly halfway horizontally and vertically.

### `pub-mobile.png`

Referência: `pub-background.png`.

Use case: stylized-concept. Asset type: mobile portrait website background. Use the attached landscape pub interior as a style and materials reference. Create a new PORTRAIT composition 1024x1536 of the same authentic warm vintage music pub, specifically framed to work as a smartphone background. The small illuminated amber Tiffany stained glass pendant MUST be visible at upper RIGHT CORNER, at approximately x=88% y=10%, small enough to leave the middle clear. Slim cropped acoustic guitar at far LEFT EDGE lower half, burgundy leather booth and small wooden round table at bottom right edge, small distressed vintage Union Jack on extreme right edge. Dark rich mahogany paneled wood wall throughout the entire middle 75% for live app content. Beautiful real textured wood and cinematic soft amber light, deep warm brown and burgundy with gold highlights. Quieter dark center with decorative elements fully confined to outer 12% edges. No people, no typography, no text, no logos, no interface. Full bleed portrait background only. Preserve the beautiful realistic painterly material detail of the supplied reference.

## Verificação

O roteiro `tools/verify-interface.cjs` verifica nove telas em 320, 390, 768, 1366 e 1920 pixels, os fluxos de criação/prévia/salvamento, transposição, curtidas, ampliação, ajustes, pesquisa, exportação, repertório e modo show, além de carregamento offline na raiz e em `v2`. Gera capturas de celular/computador e `verification.json` com os resultados da execução.

Pedal físico/MIDI e instalação efetiva em um celular não são simulados. A lógica existente foi mantida; a conferência cobre a interface de configuração e os fluxos executáveis no navegador. Não foi publicado em serviço externo.

## Revisão e retorno

Abra `http://localhost/Cifra-Dog-main/output/interface/preview.html` para comparar as capturas das telas. O aplicativo está em `http://localhost/Cifra-Dog-main/`, também acessível em `/v2/`.

A cópia dos arquivos anteriores à mudança está em `output/interface/antes-taverna.zip`. Ela não contém nem modifica os dados armazenados no navegador.
