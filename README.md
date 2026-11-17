# Cifra-Dog

App de cifras e repertórios para quem toca ao vivo. Roda no navegador, funciona sem internet, instala como programa no celular e no computador e guarda tudo no próprio aparelho: não tem servidor nem conta, é extremamente leve, coloquei muitas funções que realmente um músico usaria no app.

Começou como um site em PHP e MySQL. A versão atual, na pasta `v2/`, foi reescrita sem backend, pensando primeiro no celular, porque é nele que a cifra fica aberta no palco.

## O que dá para fazer

**Cifras**
- Transpor o tom, ver diagramas de acordes (inclusive para canhotos) e usar capotraste.
- Importar e exportar no formato ChordPro; colar uma cifra pronta e deixar o app separar letra e acordes.
- Aumentar a letra com a pinça; os acordes continuam em cima da sílaba certa.
- Modo palco, com tela limpa e botões grandes.

**Repertórios e show**
- Repertórios com blocos, intervalos e várias ordens para a mesma lista, com ordenação automática por título, artista, tom ou BPM.
- Rolagem pela cifra por BPM, ou programada: você grava uma vez em quais linhas a tela desce e o app repete no show.
- Contagem de entrada, pontinhos do compasso e modo karaokê com a frase atual e a próxima.
- Controle por pedal MIDI ou por teclado (testado com o M-VAVE Chocolate Plus), com ações configuráveis.

**Estudo**
- Vídeo do YouTube dentro da cifra, com controle de velocidade, marcação de trecho A–B e repetição.
- Afinador cromático usando o microfone, com afinações padrão, Drop D, Open G e DADGAD.
- Caderno de anotações por música.

**Dados**
- Tudo fica no IndexedDB do aparelho.
- Backup em JSON para passar do computador para o celular, com prévia antes de importar. A importação junta pelo par música e artista, sem duplicar.
- Histórico automático das últimas 12 versões e cópia de segurança antes de excluir ou importar.
- Sincronização opcional com o Google Drive (veja as limitações abaixo).

## Tecnologias

JavaScript, HTML e CSS puros, sem framework e sem etapa de build. O que sustenta o app:

- IndexedDB para o banco local.
- Service Worker e Web App Manifest para o modo offline e a instalação (PWA).
- Web MIDI para o pedal, Web Audio para o clique e o afinador.
- YouTube IFrame API para os vídeos.
- Node.js só para os scripts de `tools/` (empacotar, otimizar imagens, verificações).

## Como rodar

Não precisa instalar nada. Basta servir a pasta `v2/` por HTTP.

```bash
git clone https://github.com/rolfis-rafael/Cifra-Dog.git
cd Cifra-Dog/v2
python -m http.server 8000
```

Abra `http://localhost:8000`. Com o XAMPP, copie o projeto para `htdocs` e abra `http://localhost/Cifra-Dog/v2/` (só o Apache é necessário).

Para instalar, clique no ícone de instalar na barra de endereço do Chrome ou do Edge. No celular, publique a pasta `v2/` em qualquer hospedagem estática (eu uso o Netlify) e use "Instalar app" no menu do navegador. O MIDI exige `localhost` ou HTTPS.

Para gerar o pacote de publicação, com os 29 arquivos de execução e sem backups nem testes:

```bash
node tools/package-app.cjs
```

O resultado fica em `output/`.

## Estrutura

```
v2/
├── index.html           página única
├── sw.js                cache offline (aumente VERSAO ao mudar arquivos)
├── css/                 tema e telas
└── js/
    ├── cifra-motor.js   transposição, acordes, diagramas, ChordPro
    ├── db.js            camada de acesso ao IndexedDB
    ├── telas.js         telas: início, pesquisa, biblioteca, cifra, repertório
    ├── app.js           rotas, instalação, backup
    ├── controle.js      pedal MIDI e teclado
    ├── rolagem-bpm.js   rolagem por BPM
    ├── programada.js    rolagem programada
    ├── show-programado.js  show com vídeo e karaokê
    ├── metronomo.js     clique e contagem
    ├── aprender.js      vídeo e treino de trechos
    └── drive-backup.js  sincronização com o Drive
tools/                   scripts Node de empacotamento e verificação
```

A raiz do repositório ainda guarda a primeira versão, em PHP e MySQL (`cifra.php`, `hub.php`, `banco.sql` e arquivos relacionados). Ela fica só como histórico, e o desenvolvimento acontece em `v2/`.

## Decisões de projeto

- **Sem backend.** Quem toca ao vivo nem sempre tem sinal. Com tudo no aparelho, o app abre igual em casa e num bar sem internet, e a hospedagem é de graça.
- **Motor de cifras separado da interface.** `cifra-motor.js` não depende de DOM, então a transposição e a leitura de acordes são testáveis sozinhas.
- **Atualização automática.** O app baixa os arquivos novos ignorando o cache do navegador e recarrega sozinho quando sai versão nova.
- **Imagens leves.** As imagens principais foram convertidas para WebP, de cerca de 20 MB para 2,3 MB, e os ícones têm tamanho específico.

## Limitações

- Os dados ficam por aparelho. Para passar do computador para o celular, use exportar e importar.
- A sincronização com o Drive precisa de um cliente OAuth do tipo Web criado no Google Cloud. Foi testada com respostas simuladas e ainda falta validar numa conta real.
- A busca de vídeos funciona sem chave por servidores públicos do Piped, que às vezes ficam fora do ar. Com uma chave gratuita da YouTube Data API ela fica estável.
- Pedal MIDI só funciona no Chrome e no Edge. Vídeos do YouTube precisam de internet.
- O afinador e o pedal só foram testados em poucos aparelhos.

## Histórico de versões

Cada versão está descrita em [`v2/README.md`](v2/README.md). A atual é a 3.5.

## Licença

MIT. Veja [LICENSE](LICENSE).

## Autor

Rafael Carneiro ([@rolfis-rafael](https://github.com/rolfis-rafael))
