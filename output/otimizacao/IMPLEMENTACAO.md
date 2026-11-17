# Cifra-Dog 2.9.0 — Contraste e desempenho

O cenário recebe uma camada preta com alfa 0,4, controlada por `--escurecimento-cenario` em `css/taverna.css`. A imagem mantém 60% de visibilidade através da camada; a opacidade do app e de seu conteúdo permanece em 1. A cifra mantém seu fundo de leitura próprio.

## Imagens

As sete artes usadas pelo app foram convertidas para WebP. A logo transparente foi redimensionada para 720 × 240 e o mascote para 512 × 512, suficientes para as dimensões de exibição atuais. Foram gerados ícones PNG de 180, 192 e 512 pixels. Os originais PNG não foram apagados.

| Imagens principais | Bytes |
| --- | ---: |
| Antes | 20.087.918 |
| Depois | 2.300.560 |
| Redução | 88,55% |

O total acima compara as sete imagens equivalentes, sem contar os novos ícones. O relatório por arquivo está em `assets.json`. Trata-se de peso de arquivos, não de uma medição de velocidade de internet ou desempenho em celular físico. As versões comprimidas foram conferidas visualmente nas telas reais.

O utilitário `tools/optimize-assets.cjs` usa a instalação local de Sharp, preserva transparência e mantém as fontes. Referência consultada para a codificação: [documentação oficial de saída de imagens do Sharp](https://sharp.pixelplumbing.com/api-output/).

## Trabalho evitado

- A pesquisa prepara uma estrutura local por tela. Títulos, artistas, tons e gêneros são reaproveitados. Textos completos e acordes só são analisados quando necessários, uma vez por música nessa tela.
- As contagens de músicas dos 12 gêneros são calculadas uma vez, em vez de filtrar toda a coleção novamente para cada cartão e a cada limpeza de busca.
- A barra lateral só faz uma nova consulta durante o redimensionamento quando a janela passa do modo celular para computador. A navegação e a atualização dos dados continuam a atualizá-la normalmente.
- O cenário SVG antigo, que já estava invisível, foi retirado do HTML.
- O cache guarda os recursos em uso, com as imagens WebP e ícones novos. Não armazena as artes PNG grandes ou o fundo antigo de jornal, nem intercepta chamadas a YouTube e outros domínios. Em caso de falta de um recurso conhecido no cache, uma resposta válida da rede recompõe a entrada.

As cifras, repertórios, preferências e o mecanismo do pitch shifter não foram modificados.

## Pacote para publicar

`tools/package-app.cjs` reúne a lista de recursos do app e o Service Worker em `output/release-v2.9.0/`. O pacote tem 29 arquivos e 2.917.228 bytes antes de compactar. Não inclui as artes de origem, backups, capturas ou ferramentas de verificação. Esses arquivos permanecem no projeto para manutenção e recuperação.

O ZIP pronto está em `output/otimizacao/cifra-dog-v2.9.0.zip`. A pasta extraída pode ser publicada como site estático. O app no XAMPP continua nas entradas raiz e `/v2/`.

## Verificação

- `verify-optimization.cjs`: sete verificações sobre o pacote de distribuição, incluindo alfa de 40%, imagens válidas, reutilização da análise de acordes, consultas da barra lateral, cache atual, passagem direta de chamadas externas e funcionamento offline com gêneros e pitch de arquivo local.
- `verify-interface.cjs`: telas e fluxos principais em cinco larguras, criação, edição, repertórios, backup e uso offline nas duas entradas.
- `verify-estudio.cjs`: estúdio, arquivos locais, transposição, ocultação, troca de arquivo e controles do YouTube, além dos filtros combinados.

Os resultados ficam nos arquivos `verification.json` das pastas de cada verificação. Os testes usam perfis isolados, sem tocar nas cifras ou no perfil do navegador do usuário.

Capturas: `inicio-desktop.png`, `pesquisa-desktop.png` e `pesquisa-mobile.png`. Uma cópia dos arquivos de aplicação anteriores à mudança está em `antes-v2.9.zip`.

