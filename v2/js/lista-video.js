/*
 * lista-video.js — Lista de músicas do vídeo (nome, artista, tom, compasso e link da cifra).
 * Entra SEM a cifra: você cola cada uma pelo botão "Colar cifra" (o link do site já fica à mão).
 * Importa uma única vez, criando o repertório "Lista do vídeo" dividido em 3 blocos.
 *
 * Campos: n = número original na lista · obs = observação de compasso (ex.: "4/4 → 6/8").
 */
(function (global) {
    'use strict';

    const LISTA = [
{"n": 1, "titulo": "Careless Whisper", "artista": "George Michael", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/george-michael/careless-whisper/"},
{"n": 2, "titulo": "Beautiful Things", "artista": "Benson Boone", "tom": "B", "compasso": "4/4", "obs": "4/4 → 6/8", "fonte": "https://www.cifraclub.com.br/benson-boone/beautiful-things/"},
{"n": 3, "titulo": "Apenas Mais Uma de Amor", "artista": "Lulu Santos", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/lulu-santos/apenas-mais-uma-de-amor/"},
{"n": 4, "titulo": "Só Hoje", "artista": "Jota Quest", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/jota-quest/so-hoje/"},
{"n": 5, "titulo": "Quase Sem Querer", "artista": "Legião Urbana", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/legiao-urbana/quase-sem-quere/ktgmzj.html"},
{"n": 6, "titulo": "Como Eu Quero", "artista": "Kid Abelha", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/kid-abelha/como-eu-quero/"},
{"n": 7, "titulo": "Bete Balanço", "artista": "Cazuza", "tom": "Em", "compasso": "4/4", "obs": "4/4; há transcrição com 2/4 pontual", "fonte": "https://www.cifraclub.com.br/cazuza/bete-balanco/"},
{"n": 8, "titulo": "Times Like These", "artista": "Foo Fighters", "tom": "E", "compasso": "7/4", "obs": "7/4 ↔ 4/4", "fonte": "https://www.cifraclub.com.br/foo-fighters/times-like-these/"},
{"n": 9, "titulo": "Proibida Pra Mim", "artista": "Charlie Brown Jr.", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/proibida-pra-mim/"},
{"n": 10, "titulo": "Volta Pra Mim", "artista": "Roupa Nova", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/roupa-nova/volta-pra-mim/gttpp.html"},
{"n": 11, "titulo": "Cocaine", "artista": "Eric Clapton", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/eric-clapton/cocaine/"},
{"n": 12, "titulo": "My Sacrifice", "artista": "Creed", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/creed/my-sacrifice/"},
{"n": 13, "titulo": "Iris", "artista": "Goo Goo Dolls", "tom": "Am", "compasso": "4/4", "obs": "4/4 ↔ 6/8, com 3/4 pontual", "fonte": "https://www.cifraclub.com.br/goo-goo-dolls/iris/sjszs.html"},
{"n": 14, "titulo": "Primeiros Erros", "artista": "Capital Inicial", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/capital-inicial/primeiros-erros/"},
{"n": 15, "titulo": "Wonderwall", "artista": "Oasis", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/oasis/wonderwall/"},
{"n": 16, "titulo": "Dois Rios", "artista": "Skank", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/skank/dois-rios/"},
{"n": 17, "titulo": "Sapato Velho", "artista": "Roupa Nova", "tom": "E", "compasso": "6/8", "obs": "", "fonte": "https://www.cifraclub.com.br/roupa-nova/sapato-velho/"},
{"n": 18, "titulo": "Resposta", "artista": "Skank", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/skank/resposta/"},
{"n": 19, "titulo": "Is This Love", "artista": "Bob Marley", "tom": "C#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/bob-marley/is-this-love/"},
{"n": 20, "titulo": "Papo Reto", "artista": "Charlie Brown Jr.", "tom": "F#", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/papo-reto/"},
{"n": 21, "titulo": "This Love", "artista": "Maroon 5", "tom": "G#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/maroon-5/this-love/"},
{"n": 22, "titulo": "Sunday Morning", "artista": "Maroon 5", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/maroon-5/sunday-morning/"},
{"n": 23, "titulo": "I'm Yours", "artista": "Jason Mraz", "tom": "A", "compasso": "4/4", "obs": "4/4, com swing", "fonte": "https://www.cifraclub.com.br/jason-mraz/im-yours/"},
{"n": 24, "titulo": "Otherside", "artista": "Red Hot Chili Peppers", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/red-hot-chili-peppers/otherside/"},
{"n": 25, "titulo": "Céu Azul", "artista": "Charlie Brown Jr.", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/ceu-azul/"},
{"n": 26, "titulo": "Accidentally in Love", "artista": "Counting Crows", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/counting-crows/accidentally-in-love/"},
{"n": 27, "titulo": "Every Breath You Take", "artista": "The Police", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/the-police/every-breath-you-take/"},
{"n": 28, "titulo": "Take On Me", "artista": "a-ha", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/a-ha/take-on-me/"},
{"n": 29, "titulo": "Cowboy Fora da Lei", "artista": "Raul Seixas", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/raul-seixas/cowboy-fora-da-lei/"},
{"n": 30, "titulo": "Sweet Child O' Mine", "artista": "Guns N' Roses", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/guns-n-roses/sweet-child-omine/"},
{"n": 31, "titulo": "Don't Stop Believin'", "artista": "Journey", "tom": "Bb", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/journey/dont-stop-believin/"},
{"n": 32, "titulo": "All Star", "artista": "Smash Mouth", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/smash-mouth/all-star/"},
{"n": 33, "titulo": "November Rain", "artista": "Guns N' Roses", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/guns-n-roses/november-rain/"},
{"n": 34, "titulo": "Everlong", "artista": "Foo Fighters", "tom": "B", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/foo-fighters/everlong/"},
{"n": 35, "titulo": "O Sol", "artista": "Vitor Kley", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/vitor-kley/o-sol/"},
{"n": 36, "titulo": "Knockin' on Heaven's Door", "artista": "Guns N' Roses", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/guns-n-roses/knocking-on-heavens-door/"},
{"n": 37, "titulo": "Pais e Filhos", "artista": "Legião Urbana", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/legiao-urbana/pais-filhos/"},
{"n": 38, "titulo": "Razões e Emoções", "artista": "NX Zero", "tom": "B", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/nx-zero/razoes-emocoes/"},
{"n": 40, "titulo": "Aonde Quer Que Eu Vá", "artista": "Paralamas do Sucesso", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/os-paralamas-do-sucesso/aonde-quer-que-eu-va/"},
{"n": 41, "titulo": "Anna Júlia", "artista": "Los Hermanos", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/los-hermanos/anna-julia/"},
{"n": 42, "titulo": "Losing My Religion", "artista": "R.E.M.", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/rem/losing-my-religion/"},
{"n": 43, "titulo": "Zombie", "artista": "The Cranberries", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/the-cranberries/zombie/"},
{"n": 44, "titulo": "Outro Lugar", "artista": "Detonautas", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/detonautas/outro-lugar/"},
{"n": 45, "titulo": "Wherever You Will Go", "artista": "The Calling", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/the-calling/wherever-you-will-go/"},
{"n": 46, "titulo": "Me Encontra", "artista": "Charlie Brown Jr.", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/me-encontra/"},
{"n": 47, "titulo": "Girls Just Want to Have Fun", "artista": "Cyndi Lauper", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cyndi-lauper/girls-just-want-to-have-fun/"},
{"n": 48, "titulo": "Dreams", "artista": "Fleetwood Mac", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/fleetwood-mac/dreams/"},
{"n": 49, "titulo": "What's Up", "artista": "4 Non Blondes", "tom": "B", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/4-non-blondes/whats-up/"},
{"n": 50, "titulo": "Wish You Were Here", "artista": "Pink Floyd", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/pink-floyd/wish-you-were-here/"},
{"n": 51, "titulo": "Robocop Gay", "artista": "Mamonas Assassinas", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/mamonas-assassinas/robocop-gay/"},
{"n": 52, "titulo": "Pelados em Santos", "artista": "Mamonas Assassinas", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/mamonas-assassinas/pelados-em-santos/"},
{"n": 53, "titulo": "Billie Jean", "artista": "Michael Jackson", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/michael-jackson/billie-jean/"},
{"n": 54, "titulo": "Hotel California", "artista": "Eagles", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/the-eagles/hotel-california/"},
{"n": 55, "titulo": "Another Brick in the Wall…", "artista": "Pink Floyd", "tom": "D", "compasso": "4/4", "obs": "", "fonte": ""},
{"n": 56, "titulo": "Complicated", "artista": "Avril Lavigne", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/avril-lavigne/complicated/"},
{"n": 57, "titulo": "Like a Stone", "artista": "Audioslave", "tom": "Gm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/audioslave/like-stone/"},
{"n": 58, "titulo": "Basket Case", "artista": "Green Day", "tom": "C#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/green-day/basket-case/"},
{"n": 59, "titulo": "Don't Stop Me Now", "artista": "Queen", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/queen/dont-stop-me-now/"},
{"n": 60, "titulo": "Don't Cry", "artista": "Guns N' Roses", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/guns-n-roses/dont-cry/"},
{"n": 61, "titulo": "Creep", "artista": "Radiohead", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/radiohead/creep/sjwpsg.html"},
{"n": 62, "titulo": "Don't Look Back in Anger", "artista": "Oasis", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/oasis/dont-look-back-in-anger/"},
{"n": 63, "titulo": "Higher", "artista": "Creed", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/creed/higher/"},
{"n": 64, "titulo": "Será", "artista": "Legião Urbana", "tom": "B", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/legiao-urbana/sera/jjgp.html"},
{"n": 65, "titulo": "Um Minuto Para o Fim do Mundo", "artista": "CPM 22", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cpm-22/um-minuto-para-fim-do-mundo/"},
{"n": 66, "titulo": "Tempo Perdido", "artista": "Legião Urbana", "tom": "Dm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/"},
{"n": 67, "titulo": "Black", "artista": "Pearl Jam", "tom": "Dm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/pearl-jam/black/"},
{"n": 68, "titulo": "Maluco Beleza", "artista": "Raul Seixas", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/raul-seixas/maluco-beleza/"},
{"n": 69, "titulo": "Levo Comigo", "artista": "Restart", "tom": "Db", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/restart/levo-comigo/"},
{"n": 72, "titulo": "À Sua Maneira", "artista": "Capital Inicial", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/capital-inicial/a-sua-maneira/com-f7m.html"},
{"n": 73, "titulo": "Oh! Darling", "artista": "The Beatles", "tom": "A", "compasso": "12/8", "obs": "", "fonte": "https://www.cifraclub.com.br/the-beatles/oh-darling/"},
{"n": 74, "titulo": "Admirável Chip Novo", "artista": "Pitty", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/pitty/admiravel-chip-novo/"},
{"n": 75, "titulo": "Só os Loucos Sabem", "artista": "Charlie Brown Jr.", "tom": "Gm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/so-os-loucos-sabem/"},
{"n": 76, "titulo": "Have You Ever Seen the Rain", "artista": "Creedence", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/creedence-clearwater-revival/have-you-ever-seen-the-rain/"},
{"n": 77, "titulo": "Dias de Luta, Dias de Glória", "artista": "Charlie Brown Jr.", "tom": "C", "compasso": "3/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/dias-de-luta-dias-de-gloria/"},
{"n": 78, "titulo": "Crazy", "artista": "Aerosmith", "tom": "A", "compasso": "6/8", "obs": "", "fonte": "https://www.cifraclub.com.br/aerosmith/crazy/"},
{"n": 79, "titulo": "Como Tudo Deve Ser", "artista": "Charlie Brown Jr.", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/como-tudo-deve-ser/"},
{"n": 80, "titulo": "Dream On", "artista": "Aerosmith", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/aerosmith/dream-on/"},
{"n": 81, "titulo": "Mulher de Fases", "artista": "Raimundos", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/raimundos/mulher-de-fases/"},
{"n": 82, "titulo": "Dias Atrás", "artista": "CPM 22", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cpm-22/dias-atras/"},
{"n": 83, "titulo": "Esperando na Janela", "artista": "Cogumelo Plutão", "tom": "B", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cogumelo-plutao/esperando-na-janela/"},
{"n": 84, "titulo": "Hear Me Now", "artista": "Alok", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/alok/hear-me-now/"},
{"n": 85, "titulo": "Uptown Funk", "artista": "Bruno Mars", "tom": "F", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/bruno-mars/uptown-funk/"},
{"n": 86, "titulo": "Happy", "artista": "Pharrell Williams", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/pharrel-williams/happy/"},
{"n": 87, "titulo": "Thriller", "artista": "Michael Jackson", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/michael-jackson/thriller/"},
{"n": 88, "titulo": "Dancing Queen", "artista": "ABBA", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/abba/dancing-queen/"},
{"n": 89, "titulo": "Stayin' Alive", "artista": "Bee Gees", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/bee-gees/stayin-alive/"},
{"n": 90, "titulo": "I Will Survive", "artista": "Gloria Gaynor", "tom": "C#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/gloria-gaynor/i-will-survive/"},
{"n": 91, "titulo": "Malandragem", "artista": "Cássia Eller", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cassia-eller/malandragem/academy-violao.html"},
{"n": 93, "titulo": "Vamos Fugir", "artista": "Skank", "tom": "Dm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/skank/vamos-fugir/"},
{"n": 94, "titulo": "Twist and Shout", "artista": "The Beatles", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/the-beatles/twist-and-shout-/"},
{"n": 95, "titulo": "House of the Rising Sun", "artista": "The Animals", "tom": "Em", "compasso": "6/8", "obs": "", "fonte": "https://www.cifraclub.com.br/the-animals/house-of-the-rising-sun/"},
{"n": 96, "titulo": "Just the Two of Us", "artista": "Grover Washington Jr.", "tom": "C#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/grover-washington-jr/just-the-two-of-us/"},
{"n": 97, "titulo": "Thinking Out Loud", "artista": "Ed Sheeran", "tom": "A", "compasso": "4/4", "obs": "4/4, com subdivisão ternária", "fonte": "https://www.cifraclub.com.br/ed-sheeran/thinking-out-loud/"},
{"n": 98, "titulo": "Zóio de Lula", "artista": "Charlie Brown Jr.", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/charlie-brown-jr/zoio-de-lula/"},
{"n": 99, "titulo": "Can't Help Falling in Love", "artista": "Elvis Presley", "tom": "C", "compasso": "12/8", "obs": "12/8, também escrita em 6/8", "fonte": "https://www.cifraclub.com.br/elvis-presley/cant-help-falling-in-love/"},
{"n": 100, "titulo": "Let It Be", "artista": "The Beatles", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/the-beatles/let-it-be/"},
{"n": 101, "titulo": "Stand by Me", "artista": "John Lennon", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/john-lennon/stand-by-me/"},
{"n": 102, "titulo": "Vou Deixar", "artista": "Skank", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/skank/vou-deixar/"},
{"n": 103, "titulo": "Perfect", "artista": "Ed Sheeran", "tom": "F", "compasso": "12/8", "obs": "12/8, também escrita em 6/8", "fonte": "https://www.cifraclub.com.br/ed-sheeran/perfect/"},
{"n": 104, "titulo": "Exagerado", "artista": "Cazuza", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cazuza/exagerado/"},
{"n": 106, "titulo": "O Sol", "artista": "Jota Quest", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/jota-quest/o-sol/"},
{"n": 107, "titulo": "Whisky a Go Go", "artista": "Roupa Nova", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/roupa-nova/whisky-go-go/"},
{"n": 108, "titulo": "O Segundo Sol", "artista": "Cássia Eller", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/cassia-eller/o-segundo-sol/"},
{"n": 109, "titulo": "Ain't No Sunshine", "artista": "Bill Withers", "tom": "Am", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/bill-withers/aint-no-sunshine/"},
{"n": 110, "titulo": "One Last Breath", "artista": "Creed", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/creed/one-last-breath/"},
{"n": 111, "titulo": "Que Nem Maré", "artista": "Jorge Vercillo", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/jorge-vercillo/que-nem-mare/"},
{"n": 114, "titulo": "Chão de Giz", "artista": "Zé Ramalho", "tom": "G", "compasso": "6/8", "obs": "", "fonte": "https://www.cifraclub.com.br/ze-ramalho/chao-de-giz/"},
{"n": 116, "titulo": "Jailhouse Rock", "artista": "Elvis Presley", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/elvis-presley/jailhouse-rock/"},
{"n": 117, "titulo": "Metamorfose Ambulante", "artista": "Raul Seixas", "tom": "B", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/raul-seixas/metamorfose-ambulante/"},
{"n": 118, "titulo": "L-O-V-E", "artista": "Michael Bublé", "tom": "C", "compasso": "4/4", "obs": "4/4, com swing", "fonte": "https://www.cifraclub.com.br/michael-buble/l-o-v-e/"},
{"n": 119, "titulo": "Outra Vida", "artista": "Armandinho", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/armandinho/outra-vida/"},
{"n": 120, "titulo": "I Gotta Feeling", "artista": "Black Eyed Peas", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/black-eyed-peas/i-gotta-feeling/"},
{"n": 121, "titulo": "Se Ela Dança, Eu Danço", "artista": "MC Leozinho", "tom": "Em", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/mc-leozinho/se-ela-danca-eu-danco/"},
{"n": 122, "titulo": "O Descobridor dos Sete Mares", "artista": "Tim Maia", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/tim-maia/o-descobridor-dos-sete-mares/"},
{"n": 123, "titulo": "Homem Aranha", "artista": "Jorge Vercillo", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/jorge-vercillo/homem-aranha/"},
{"n": 124, "titulo": "Fico Assim Sem Você", "artista": "Adriana Calcanhotto", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/adriana-calcanhotto/fico-assim-sem-voce/"},
{"n": 125, "titulo": "Festa no Apê", "artista": "Latino", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/latino/festa-no-ape/"},
{"n": 126, "titulo": "Telegrama", "artista": "Zeca Baleiro", "tom": "Dm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/zeca-baleiro/telegrama/"},
{"n": 127, "titulo": "Cerol na Mão", "artista": "Bonde do Tigrão", "tom": "E", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/bonde-do-tigrao/cerol-na-mao/"},
{"n": 128, "titulo": "Não Quero Dinheiro", "artista": "Tim Maia", "tom": "F#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/tim-maia/nao-quero-dinheiro/"},
{"n": 129, "titulo": "Amei Te Ver", "artista": "Tiago Iorc", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/tiago-iorc/amei-te-ver/"},
{"n": 130, "titulo": "Final Feliz", "artista": "Jorge Vercillo", "tom": "C", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/jorge-vercillo/final-feliz/"},
{"n": 131, "titulo": "Alma Gêmea", "artista": "Fábio Jr.", "tom": "A", "compasso": "12/8", "obs": "12/8, há arranjo em 6/8", "fonte": "https://www.cifraclub.com.br/fabio-jr/alma-gemea/"},
{"n": 132, "titulo": "Morena, part. Bruno Martini", "artista": "Vitor Kley", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/vitor-kley/morena-part-bruno-martini/"},
{"n": 133, "titulo": "Se", "artista": "Djavan", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/djavan/se/"},
{"n": 134, "titulo": "Pupila", "artista": "Vitor Kley", "tom": "Bb", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/vitor-kley/pupila/"},
{"n": 135, "titulo": "Um Anjo do Céu", "artista": "Maskavo", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/maskavo/um-anjo-do-ceu/ztszg.html"},
{"n": 136, "titulo": "Ouvi Dizer", "artista": "Melim", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/melim/ouvi-dizer/"},
{"n": 137, "titulo": "Andei Só", "artista": "Natiruts", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/natiruts/andei-so/"},
{"n": 138, "titulo": "Pra Você", "artista": "Onze:20", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/onze20/pra-voce/"},
{"n": 139, "titulo": "Felicidade", "artista": "Seu Jorge", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/seu-jorge/felicidade/"},
{"n": 140, "titulo": "Samurai", "artista": "Djavan", "tom": "Bm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/djavan/samurai/"},
{"n": 141, "titulo": "Anjos", "artista": "O Rappa", "tom": "G#m", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/o-rappa/anjos/"},
{"n": 142, "titulo": "Velha Infância", "artista": "Tribalistas", "tom": "Am", "compasso": "6/8", "obs": "6/8 ou 12/8", "fonte": "https://www.cifraclub.com.br/tribalistas/velha-infancia/"},
{"n": 143, "titulo": "Sina", "artista": "Djavan", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/djavan/sina/"},
{"n": 144, "titulo": "Azul da Cor do Mar", "artista": "Tim Maia", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/tim-maia/azul-da-cor-do-mar/"},
{"n": 145, "titulo": "Burguesinha", "artista": "Seu Jorge", "tom": "A", "compasso": "4/4", "obs": "4/4; leitura binária de samba", "fonte": "https://www.cifraclub.com.br/seu-jorge/burguesinha/academy-mpb.html"},
{"n": 146, "titulo": "Monalisa", "artista": "Jorge Vercillo", "tom": "Dm", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/jorge-vercillo/monalisa/"},
{"n": 147, "titulo": "Asas", "artista": "Maskavo", "tom": "G", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/maskavo/asas/"},
{"n": 148, "titulo": "Flor de Lis", "artista": "Djavan", "tom": "A", "compasso": "2/4", "obs": "2/4, também agrupável em 4/4", "fonte": "https://www.cifraclub.com.br/djavan/flor-de-lis/"},
{"n": 149, "titulo": "Gostava Tanto de Você", "artista": "Tim Maia", "tom": "A", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/tim-maia/gostava-tanto-de-voce/"},
{"n": 150, "titulo": "Eu Te Devoro", "artista": "Djavan", "tom": "D", "compasso": "4/4", "obs": "", "fonte": "https://www.cifraclub.com.br/djavan/eu-te-devoro/"}
];

    const BLOCOS = [[1, 50, 'Músicas 1 a 50'], [51, 100, 'Músicas 51 a 100'], [101, 150, 'Músicas 101 a 150']];
    const chave = (s) => UI.normal(s).replace(/[^a-z0-9]/g, '');

    async function importarSePreciso() {
        if (await DB.lerMeta('lista-video-v1')) return;
        // Não duplica: pula o que já existe com mesmo título + artista.
        const existentes = new Map((await DB.listarMusicas()).map(m => [chave(m.titulo + m.artista), m]));
        const itens = [];
        let blocoAtual = null;
        for (const e of LISTA) {
            const b = BLOCOS.find(x => e.n >= x[0] && e.n <= x[1]);
            if (b && b !== blocoAtual) { blocoAtual = b; itens.push({ id: DB.novoId(), tipo: 'bloco', nome: b[2] }); }
            let m = existentes.get(chave(e.titulo + e.artista));
            if (!m) {
                m = await DB.salvarMusica({
                    titulo: e.titulo, artista: e.artista, tom: e.tom, compasso: e.compasso,
                    obsCompasso: e.obs, fonte: e.fonte, numeroLista: e.n, cifra: '', bpm: 0,
                });
            }
            itens.push({ id: DB.novoId(), tipo: 'musica', musicaId: m.id, semitons: 0 });
        }
        if (!(await DB.listarRepertorios()).some(r => r.nome === 'Lista do vídeo')) await DB.salvarRepertorio({ nome: 'Lista do vídeo', descricao: 'Cole as cifras aos poucos', abertoEm: Date.now() + 1, itens });
        await DB.gravarMeta('lista-video-v1', true);
    }

    global.ListaVideo = { importarSePreciso, total: LISTA.length };
})(window);
