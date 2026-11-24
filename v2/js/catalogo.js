/* Gêneros da coleção. A escolha salva na música sempre tem prioridade. */
(function (global) {
    'use strict';
    const generos = [
        // [id, nome, variações (frase curta que aparece embaixo do nome na busca)]
        ['rock', 'Rock', 'rock nacional / clássicos'], ['pop', 'Pop', 'pop / pop rock'], ['metal', 'Metal', 'metal / hard rock'], ['sertanejo', 'Sertanejo', 'sertanejo / modão'],
        ['mpb', 'MPB', 'MPB / bossa nova'], ['samba', 'Samba', 'samba / pagode'], ['reggae', 'Reggae', 'reggae / ska'], ['gospel', 'Gospel', 'gospel / religioso'],
        ['blues', 'Blues', 'blues / soul'], ['jazz', 'Jazz', 'jazz / standards'], ['forro', 'Forró', 'forró / baião'], ['funk', 'Funk', 'hip hop / funk'],
    ].map(([id, nome, variacoes], arte) => ({ id, nome, variacoes, arte }));
    const artistas = {
        rock: ['legiao urbana', 'foo fighters', 'charlie brown jr', 'creed', 'goo goo dolls', 'capital inicial', 'oasis', 'skank', 'cazuza', 'barao vermelho', 'raul seixas', 'rita lee', 'titas', 'paralamas do sucesso', 'engenheiros do hawaii', 'detonautas', 'pitty', 'nirvana', 'pearl jam', 'red hot chili peppers', 'ac dc', 'ac/dc', 'guns n roses', 'guns n\' roses', 'bon jovi', 'queen', 'the beatles', 'pink floyd', 'u2', 'r e m', 'r.e.m.', 'los hermanos', 'jota quest', 'kid abelha', 'lulu santos', 'the calling', 'audioslave', 'linkin park', 'nickelback', 'green day', 'the cranberries', 'eagles', 'dire straits', '4 non blondes', 'chuck berry', 'elvis presley'],
        pop: ['george michael', 'benson boone', 'roupa nova', 'michael jackson', 'bruno mars', 'adele', 'ed sheeran', 'maroon 5', 'coldplay', 'the police', 'sting', 'a ha', 'a-ha', 'tears for fears', 'roxette', 'phil collins', 'elton john', 'toto', 'simply red', 'backstreet boys', 'robbie williams', 'seal', 'john mayer', 'james blunt', 'soul asylum', 'avril lavigne', 'hoobastank', 'christina perri', 'harry styles', 'taylor swift', 'lady gaga', 'dua lipa', 'sabrina carpenter', 'shakira'],
        metal: ['metallica', 'iron maiden', 'black sabbath', 'ozzy osbourne', 'megadeth', 'slipknot', 'system of a down', 'sepultura', 'pantera', 'judas priest', 'angra', 'rammstein', 'avenged sevenfold', 'disturbed'],
        sertanejo: ['chitaozinho e xororo', 'zeze di camargo e luciano', 'leandro e leonardo', 'leonardo', 'jorge e mateus', 'henrique e juliano', 'marilia mendonca', 'gusttavo lima', 'luan santana', 'bruno e marrone', 'victor e leo', 'almir sater', 'sergio reis', 'daniel', 'ze neto e cristiano', 'maiara e maraisa', 'ana castela', 'michel telo'],
        mpb: ['djavan', 'tim maia', 'seu jorge', 'jorge vercillo', 'caetano veloso', 'gilberto gil', 'alceu valenca', 'zeca baleiro', 'nando reis', 'c a s s i a eller', 'cassia eller', 'tribalistas', 'maria gadu', 'ana carolina', 'anavitoria', 'lenine', 'cicero', 'milton nascimento', 'chico buarque', 'elis regina', 'marisa monte', 'cazuza', 'toquinho', 'vinicius de moraes', 'belchior', 'flavio venturini', 'guilherme arantes', 'adriana calcanhotto', 'sandra de sa', 'javan', 'ivan lins'],
        samba: ['zeca pagodinho', 'cartola', 'beth carvalho', 'paulinho da viola', 'alcione', 'fundo de quintal', 'sorriso maroto', 'turma do pagode', 'thiaguinho', 'exaltasamba', 'péricles', 'pericles', 'dilsinho', 'grupo revelacao', 'diogo nogueira', 'martinho da vila', 'jorginho do imperio'],
        reggae: ['bob marley', 'maskavo', 'natiruts', 'maneva', 'ar mandinho', 'armandinho', 'chimarruts', 'cidade negra', 'tribo de jah', 'ponto de equilibrio', 'groundation', 'ub40'],
        gospel: ['aline barros', 'fernandinho', 'anderson freire', 'gabriela rocha', 'diante do trono', 'morada', 'isaias saad', 'preto no branco', 'kemuel', 'oficina g3', 'rosa de saron', 'padre marcelo rossi', 'marcelo rossi', 'padre fabio de melo'],
        blues: ['eric clapton', 'b b king', 'b.b. king', 'stevie ray vaughan', 'muddy waters', 'buddy guy', 'john lee hooker', 'robert johnson', 'joe bonamassa', 'gary moore'],
        jazz: ['frank sinatra', 'louis armstrong', 'ella fitzgerald', 'chet baker', 'nina simone', 'tom jobim', 'antonio carlos jobim', 'joao gilberto', 'miles davis', 'norah jones'],
        forro: ['luiz gonzaga', 'dominguinhos', 'falamansa', 'elba ramalho', 'flavio jose', 'mastruz com leite', 'avioes do forro', 'wesley safadao', 'xand aviao', 'gilberto gil'],
        funk: ['claudinho e buchecha', 'buchecha', 'mc marcinho', 'ludmilla', 'anitta', 'mc kevinho', 'mc hariel', 'mc livinho', 'dennis dj', 'kevin o chris', 'tati quebra barraco'],
    };
    const normal = s => UI.normal(s).replace(/[^a-z0-9]/g, '');
    const indice = new Map();
    artistas.rock.push('Aerosmith', 'Cogumelo Plutão', 'Counting Crows', 'CPM 22', 'Creedence', 'Creedence Clearwater Revival', 'Fleetwood Mac', 'John Lennon', 'Journey', 'Mamonas Assassinas', 'NX Zero', 'O Rappa', 'Radiohead', 'Raimundos', 'Restart', 'Smash Mouth', 'The Animals');
    artistas.pop.push('ABBA', 'Alok', 'Bee Gees', 'Bill Withers', 'Black Eyed Peas', 'Cyndi Lauper', 'Gloria Gaynor', 'Jason Mraz', 'Latino', 'Melim', 'Pharrell Williams', 'Tiago Iorc', 'Vitor Kley', 'Fábio Jr.');
    artistas.jazz.push('Grover Washington Jr.', 'Michael Bublé');
    artistas.mpb.push('Zé Ramalho'); artistas.reggae.push('Onze:20');
    artistas.funk.push('Bonde do Tigrão', 'MC Leozinho');
    for (const [genero, nomes] of Object.entries(artistas)) for (const nome of nomes) {
        const k = normal(nome); indice.set(k, [...(indice.get(k) || []), genero]);
    }
    function generosDe(m) {
        if (m.genero) return [m.genero];
        return indice.get(normal(m.artista)) || [];
    }
    global.Catalogo = { generos, generosDe, nome: id => generos.find(g => g.id === id)?.nome || id };
})(window);
