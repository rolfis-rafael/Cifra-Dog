# cifradog-pacotes

Pacotes de cifras livres para o [Cifra-Dog](https://github.com/rolfis-rafael/Cifra-Dog). O app baixa o `catalogo.json` deste repositório e instala cada pacote quando a pessoa toca em "Instalar". Depois disso as músicas funcionam sem internet.

Só entram cifras de **domínio público** ou com **licença livre** (CC0, CC BY, CC BY-SA) ou com autorização do autor.

## Estrutura

```
catalogo.json              lista de pacotes (gerado pelo script, não edite à mão)
pacotes/<id>.json          um arquivo por pacote
esquema/cifradog.schema.json   formato dos arquivos
ferramentas/gerar-catalogo.cjs gera o catálogo e confere os pacotes
.nojekyll                  faz o GitHub Pages servir os arquivos como estão
```

## Publicar no GitHub Pages

1. Crie no GitHub um repositório **público** chamado `cifradog-pacotes` e envie esta pasta.
2. No repositório, abra **Settings → Pages**, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`.
3. Em alguns minutos o catálogo fica em `https://rolfis-rafael.github.io/cifradog-pacotes/catalogo.json`, o endereço que o app usa por padrão.

Se o repositório tiver outro nome, troque `CATALOGO_GITHUB` em `js/pacotes.js` do app, ou mude o endereço na tela **Pacotes de músicas → Endereço do catálogo**.

## Testar no XAMPP antes de publicar

Deixe esta pasta ao lado da `v2` (`htdocs/Cifra-Dog/cifradog-pacotes`). Aberto em `localhost`, o app usa `../cifradog-pacotes/catalogo.json` sozinho.

## Adicionar ou atualizar um pacote

1. Crie ou edite `pacotes/<id>.json`. O nome do arquivo precisa ser igual ao `pacote.id`.
2. Cada música precisa de `licenca.tipo` livre e `licenca.fonte`. CC BY e CC BY-SA também precisam de `licenca.atribuicao` (o crédito aparece na tela da cifra).
3. Ao mudar o conteúdo de um pacote, aumente `pacote.revisao` em 1. É isso que faz o app oferecer "Atualizar".
4. Rode `node ferramentas/gerar-catalogo.cjs`. Se algo estiver errado, ele mostra o problema e não gera o catálogo.
5. Envie as mudanças (`catalogo.json` junto).

No app, atualizar um pacote nunca apaga o que é seu: músicas que você editou e músicas suas com o mesmo nome continuam como estão.

## Formato de uma linha de cifra

Acorde entre colchetes, colado na sílaba: `"[G]Ciranda, ciran[D7]dinha"`. Linha só de acordes: `{ "tipo": "acordes", "texto": "[G] [D7] [G]" }`. Observação: `{ "tipo": "obs", "texto": "2x" }`.
