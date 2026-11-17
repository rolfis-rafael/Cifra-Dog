# Cifra Dog 2.8.1 — Identidade alternativa e estúdio

## Direção visual final

A gravura séria foi substituída após a correção do usuário. O resultado final é um Doberman em desenho, expressivo, de bandana e guitarra, com contornos pretos, sombras em blocos, cores de pôster e desgaste vintage. As artes de carregamento de GTA San Andreas serviram como referência de linguagem gráfica.

As imagens finais foram geradas com a ferramenta nativa e estão em `img/brand/`, também copiadas em `v2/img/brand/`:

- `logo-pub.png`: logo horizontal transparente com o dog e letras desenhadas CIFRA DOG.
- `dog-pub.png`: mascote principal, usado no Início, avatar, estúdio e ícone do aplicativo.
- `genres-atlas.png`: 12 ilustrações, aplicadas por coordenadas CSS; não há 12 downloads separados.

O restante da identidade da taverna — madeira, couro, papel e vermelho — foi mantido.

## Pesquisa e classificação

Gêneros: Rock, Pop, Metal, Sertanejo, MPB, Samba, Reggae, Gospel, Blues, Jazz, Forró e Funk. Cada categoria mostra a quantidade de músicas na coleção local. A classificação inicial usa um mapa de artistas; artistas de vários estilos podem aparecer em mais de um gênero. Não há classificação inventada para artistas desconhecidos. A escolha explícita em Criar/Editar → Mais opções → Gênero tem prioridade. Há também a escolha Outros.

O tom deixou de ser a grade principal. Um seletor combina o tom com gênero e busca por título, artista, letra ou acorde. Os filtros ficam na URL e Limpar filtros restaura a grade dos gêneros.

## Estúdio

O botão Aprender com vídeo fica na cifra. O quadro tem moldura de madeira, plaquinha com o nome da música e cordinha que pode ser clicada ou puxada. Sair da cifra também encerra o estúdio.

### YouTube

Links de vídeos, Shorts, lives e URLs curtas são validados por domínio e ID. O vídeo associado fica salvo por música. A API é carregada somente ao abrir um link. Há controle de velocidade com os valores disponíveis para aquele vídeo, mensagens de falha e recolhimento sem recriar o iframe.

O modo recolhido mantém o player visível, com mais de 200 × 200 pixels. **Não é reprodução totalmente oculta. Não há pitch shifter no áudio do YouTube.** A API de iframe não fornece acesso ao áudio, e as políticas proíbem modificar/separar componentes e reproduzir em player de fundo não exibido. Não foram criados extratores ou serviços de download.

Referências oficiais consultadas: [API de iframe](https://developers.google.com/youtube/iframe_api_reference) e [políticas do YouTube, seção de restrições adicionais](https://developers.google.com/youtube/terms/developer-policies).

### Arquivos locais

Um arquivo de áudio ou vídeo do aparelho é reproduzido por um único elemento de mídia com URL de objeto, sem upload nem decodificação integral implementada pelo aplicativo. Ocultar mantém a reprodução; Voltar ao estúdio reabre o mesmo quadro.

O pitch shifter oferece −12 a +12 semitons em passos de 1, atalhos −5/−2/0/+2/+5 e velocidade independente. É um processador granular de duas cabeças, executado em AudioWorklet. Não inclui FFT, dependências de DSP ou processamento de áudio no fluxo da interface. Buffers e tabela de pesos usam 139.264 bytes fixos, além dos objetos e recursos nativos do navegador.

O módulo carrega apenas na primeira transposição; Original usa caminho direto; pausar suspende o contexto; fechar ou trocar de fonte fecha o contexto e revoga a URL. Na troca de arquivo, o elemento de mídia é renovado para evitar reutilizar uma fonte Web Audio que só pode ser criada uma vez por elemento.

A técnica pode colorir o áudio, especialmente em transposições grandes. É uma escolha voltada a ensaio com processamento leve. O benchmark local de DSP não equivale a teste de desempenho em celular físico. Navegadores precisam suportar AudioWorklet em localhost ou HTTPS. Formatos dependem dos codecs disponíveis no navegador. [Referência de AudioWorkletNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode).

## Remoção das demonstrações

As músicas não são mais semeadas. A migração remove apenas os exemplos antigos cujo título, artista e texto correspondem aos originais. Letra modificada é preservada. A remoção usa o método de banco que também limpa referências de todas as ordens dos repertórios. O repertório Ensaio de sábado só é apagado quando é o original de exemplo e está vazio.

O registro local `backup-exemplos-v28` guarda as músicas removidas e o estado dos repertórios para recuperação, e `limpeza-exemplos-v28` evita repetir a migração. Não foram alterados os arquivos pessoais de backup existentes no projeto. A cópia da aplicação anterior está em `output/estudio/antes-v2.8.zip`.

## Validação

- `tools/verify-interface.cjs`: 53 verificações de telas em cinco larguras, fluxos do aplicativo e offline na raiz e `v2`.
- `tools/verify-estudio.cjs`: 16 verificações dos novos recursos, incluindo migração, preservação de edições, filtros combinados, quadros de no mínimo 200 × 200, áudio real local, transposição, ocultação contínua, reabertura, suspensão, troca de arquivo, gesto da cordinha e encerramento ao navegar. O teste determinístico de controles do YouTube usa API simulada, sem representar prova de streaming.
- `tools/verify-pitch.cjs`: oito transposições, dois canais, limite de amplitude, silêncio e bypass, com medição espectral e tempo de processamento. Resultados em `pitch-verification.json`.
- `tools/check-youtube.cjs`: conexão real em perfil isolado com o vídeo público de exemplo da documentação. A API carregou, o iframe foi criado e o evento de pronto foi recebido. Isso não atesta disponibilidade de todos os vídeos ou reprodução em todos os aparelhos. Resultado em `youtube-live.json`.

Os testes usam perfis novos e arquivos de áudio gerados para a verificação. Não acessam o perfil do usuário nem seus arquivos de áudio. Capturas reais estão nesta pasta, e a galeria `preview.html` reúne a identidade e o estúdio.

## Prompts finais das imagens

### Mascote

Use case: illustration-story. Asset type: bold distinctive website mascot portrait. A charismatic black and tan DOBERMAN musician mascot, unmistakably a DRAWN CARTOON character, inspired by the confident graphic illustrated loading-screen artworks of GTA San Andreas: thick black ink outlines, clean flat cel-shaded color blocks, dramatic comic shadows, exaggerated expressive brows and cocky sideways grin. Upright tall pointed ears, black and caramel fur. Three-quarter bust portrait, one paw gripping an electric guitar neck in foreground. Wears an oxblood red bandana around neck, worn open black denim vest, a small brass guitar-pick pendant, a tiny ear piercing. Adult alternative rock / hip hop street musician vibe, playful cool confidence, distinctly mascot not realistic animal. Square composition with dog's head and shoulders centered filling 80%, ears visible. Background: simple muted dusty teal with a cream sunburst and very subtle old screenprinted paper wear. Restrained warm mustard gold, brick red, charcoal and cream vintage palette. High impact readable small avatar silhouette. CRITICAL: flat bold cartoon drawing, not engraving, not etching, not realistic, no fur hatch texture, no Victorian waistcoat, no suit, no serious portrait. No text, no lettering, no logos, no watermark. Polished original character design, humorous charming and cool.

### Logo

Referência visual: mascote final acima. Fundo transparente.

Use case: logo-brand. Asset type: production horizontal transparent logo for CIFRA DOG music app. Reuse the exact charismatic cartoon Doberman from reference as a small head-and-bandana emblem on LEFT, same smirking face, tall ears, ear piercing, brick red bandana. On RIGHT exact brand text "CIFRA DOG" in bold custom hand-lettered cream uppercase with thick black outline and muted mustard offset shadow. Cool alternative streetwear / skateboard gig poster identity, dynamic slightly angled expressive comic lettering, bold graphic ink contours and cel-shaded color blocks inspired by GTA San Andreas illustrated loading screens. Vintage distressed screenprint touches with warm cream, brick red, aged mustard and tiny dusty teal accent. Grown-up mischievous music mascot, confident and fun, NOT realistic, NOT Victorian, no engraving, no formal serif. Wide horizontal 3:1 logo lockup, tight clean composition, dog emblem 25% width lettering 75%, text crisp and easy to read at 170px, no small details. Small guitar pick or lightning underline only if composition allows. Transparent outside the logo, no scene or rectangular background. No extra text, no tagline, no watermarks. Professional coherent mascot and hand-lettered wordmark.

### Gêneros

Referência visual: mascote final acima.

Use case: illustration-story. Asset type: TWELVE category illustrations in a production image atlas. EXACT layout FOUR COLUMNS by THREE ROWS, twelve equally-sized square panels, edge-to-edge NO GAPS. Overall 4:3 landscape image. All depict the SAME charismatic CARTOON black and tan Doberman mascot in the supplied reference, same expressive cheeky eyes, tall ears, angular muzzle, ear ring, confident grin. Style of GTA San Andreas graphic illustrated loading screens: thick bold black contours, flat cel-shaded blocks, dramatic comic shadows, streetwear cool attitude, alternative music gig poster energy, worn vintage screenprinted paper texture. NO realistic fur, NO etching, NO engraving, NO formal serious portraits. Strong bright muted vintage palette, each panel own brick red / dusty teal / mustard / dark green background and cream sunburst shapes. Centered chest-up dog characters. ROW1 COL1 ROCK: black denim vest, red bandana, electric guitar. ROW1 COL2 POP: purple bomber, microphone, star shades on head. ROW1 COL3 METAL: long black mane, studded vest, black guitar, cheeky toothy grin. ROW1 COL4 SERTANEJO: cowboy hat, denim, acoustic guitar. ROW2 COL1 MPB: open patterned shirt, classical guitar. ROW2 COL2 SAMBA: straw fedora tilted, white shirt, pandeiro. ROW2 COL3 REGGAE: knit red/gold/green cap, dreadlocks, round shades. ROW2 COL4 GOSPEL: cream jacket, microphone, confident singing. ROW3 COL1 BLUES: tilted fedora, harmonica, blue shirt. ROW3 COL2 JAZZ: hip burgundy jacket, brass saxophone. ROW3 COL3 FORRO: northeastern Brazilian leather hat, accordion. ROW3 COL4 FUNK: modern tracksuit, headphones around neck, brass chain. Exact equal tile sizes at x=25%,50%,75%; y=33.333%,66.666%. Each character clearly differentiated by outfit and instrument but same recognizable mascot. No text, no letters, no labels, no logos, no watermark. More fun mischievous cartoon mascot than serious realism.
