<?php
/*
 * ============================================================
 *  cifra.php — Página de uma cifra (o coração do CifraDog)
 * ============================================================
 *  Endereço: cifra.php?id=5            (cifra normal)
 *            cifra.php?id=5&rep=2      (dentro de um repertório: modo show)
 *
 *  Partes do arquivo:
 *   1. PHP: busca a música, versões, avaliação, favoritos, comentários
 *      e (se tiver ?rep=) o repertório com anterior/próxima
 *   2. HTML: cabeçalho da música, barra do repertório
 *   3. HTML: ABAS → Cifra | Letra | Acordes | Tablatura | Vídeo | Comentários
 *   4. HTML: painel de ferramentas (tom, capo, rolagem, metrônomo…)
 *   5. Barra flutuante do celular / modo palco
 *
 *  Quem dá vida a tudo é assets/js/cifra-pagina.js (usa o cifra-motor.js).
 *  ONDE: o texto da cifra é desenhado pelo JS dentro de <div id="cifra-saida">.
 * ============================================================
 */
require_once __DIR__ . '/includes/bootstrap.php';

$id = (int)($_GET['id'] ?? 0);
$uid = idUsuario();

// ---------- 1. Busca a música ----------
$st = $pdo->prepare('SELECT m.*, u.username AS autor
                     FROM musicas m LEFT JOIN usuarios u ON u.id = m.usuario_id
                     WHERE m.id = ?');
$st->execute([$id]);
$musica = $st->fetch();

if (!$musica) {
    http_response_code(404);
    $tituloPagina = 'Cifra não encontrada - CifraDog';
    require __DIR__ . '/includes/cabecalho.php';
    echo '<main class="container vazio-grande"><img src="img/dog.png" alt="" class="dog-triste"><h1>Essa cifra fugiu do canil 🐾</h1><p>Ela pode ter sido apagada ou o link está errado.</p><a class="btn btn-ouro" href="hub.php">Voltar para o início</a></main>';
    require __DIR__ . '/includes/rodape.php';
    exit;
}

// Conta 1 visualização por sessão (recarregar a página não infla o número).
if (empty($_SESSION['vistas'][$id])) {
    $pdo->prepare('UPDATE musicas SET visualizacoes = visualizacoes + 1 WHERE id = ?')->execute([$id]);
    $_SESSION['vistas'][$id] = true;
    $musica['visualizacoes']++;
}

// Outras versões da mesma música (mesmo título + artista).
$st = $pdo->prepare('SELECT m.id, u.username AS autor, m.media_avaliacao
                     FROM musicas m LEFT JOIN usuarios u ON u.id = m.usuario_id
                     WHERE m.titulo = ? AND m.artista = ? ORDER BY m.media_avaliacao DESC, m.id');
$st->execute([$musica['titulo'], $musica['artista']]);
$versoes = $st->fetchAll();

// Nota que o usuário deu, se já favoritou, e total de favoritos.
$notaUsuario = 0;
$ehFavorita = false;
$repertoriosUsuario = [];
if ($uid) {
    $st = $pdo->prepare('SELECT nota FROM avaliacoes WHERE musica_id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $notaUsuario = (int)$st->fetchColumn();

    $st = $pdo->prepare('SELECT 1 FROM favoritos WHERE musica_id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $ehFavorita = (bool)$st->fetchColumn();

    $st = $pdo->prepare('SELECT r.id, r.nome,
                                EXISTS(SELECT 1 FROM repertorio_itens i WHERE i.repertorio_id = r.id AND i.musica_id = ?) AS tem
                         FROM repertorios r WHERE r.usuario_id = ? ORDER BY r.nome');
    $st->execute([$id, $uid]);
    $repertoriosUsuario = $st->fetchAll();
}
$st = $pdo->prepare('SELECT COUNT(*) FROM favoritos WHERE musica_id = ?');
$st->execute([$id]);
$totalFavoritos = (int)$st->fetchColumn();

// Comentários (mais novos primeiro).
$st = $pdo->prepare('SELECT c.id, c.texto, c.criado_em, c.usuario_id, u.username
                     FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id
                     WHERE c.musica_id = ? ORDER BY c.id DESC');
$st->execute([$id]);
$comentarios = $st->fetchAll();

// ---------- Modo repertório (?rep=) ----------
$rep = null;
$repIndice = -1;
$repItens = [];
$repSemitons = null;
if ($uid && !empty($_GET['rep'])) {
    $st = $pdo->prepare('SELECT * FROM repertorios WHERE id = ? AND usuario_id = ?');
    $st->execute([(int)$_GET['rep'], $uid]);
    $rep = $st->fetch() ?: null;
    if ($rep) {
        $st = $pdo->prepare('SELECT i.musica_id, i.semitons, m.titulo FROM repertorio_itens i
                             JOIN musicas m ON m.id = i.musica_id
                             WHERE i.repertorio_id = ? ORDER BY i.posicao, i.id');
        $st->execute([$rep['id']]);
        $repItens = $st->fetchAll();
        foreach ($repItens as $i => $item) {
            if ((int)$item['musica_id'] === $id) {
                $repIndice = $i;
                $repSemitons = (int)$item['semitons'];
            }
        }
        if ($repIndice < 0) $rep = null; // música não está nesse repertório
    }
}

$ehDono = $uid && (int)$musica['usuario_id'] === $uid;
$videoEmbed = linkYoutubeEmbed($musica['video_url']);

// ---------- Monta a página ----------
$tituloPagina = $musica['titulo'] . ' - ' . $musica['artista'] . ' | CifraDog';
$classeBody = 'pagina-cifra';
require __DIR__ . '/includes/cabecalho.php';
?>

<main class="container cifra-pagina">

    <?php if ($rep): ?>
    <!-- ========== Barra do repertório (modo show) ========== -->
    <div class="barra-repertorio">
        <a href="repertorio.php?id=<?= (int)$rep['id'] ?>" class="rep-nome"><i class="fa-solid fa-list-ol"></i> <?= e($rep['nome']) ?></a>
        <span class="rep-posicao"><?= $repIndice + 1 ?> / <?= count($repItens) ?></span>
        <div class="rep-nav">
            <?php if ($repIndice > 0): $ant = $repItens[$repIndice - 1]; ?>
                <a class="btn btn-escuro btn-pequeno" id="rep-anterior" href="cifra.php?id=<?= (int)$ant['musica_id'] ?>&rep=<?= (int)$rep['id'] ?>" title="<?= e($ant['titulo']) ?> (←)"><i class="fa-solid fa-backward-step"></i> <span><?= e($ant['titulo']) ?></span></a>
            <?php endif; ?>
            <?php if ($repIndice < count($repItens) - 1): $prox = $repItens[$repIndice + 1]; ?>
                <a class="btn btn-ouro btn-pequeno" id="rep-proxima" href="cifra.php?id=<?= (int)$prox['musica_id'] ?>&rep=<?= (int)$rep['id'] ?>" title="<?= e($prox['titulo']) ?> (→)"><span><?= e($prox['titulo']) ?></span> <i class="fa-solid fa-forward-step"></i></a>
            <?php else: ?>
                <span class="rep-fim"><i class="fa-solid fa-flag-checkered"></i> Última do show</span>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- ========== 2. Cabeçalho da música ========== -->
    <header class="musica-cabecalho">
        <div class="musica-titulos">
            <h1><?= e($musica['titulo']) ?></h1>
            <a class="musica-artista" href="hub.php?artista=<?= urlencode($musica['artista']) ?>"><?= e($musica['artista']) ?></a>
            <div class="musica-autor">
                Enviada por
                <?php if ($musica['usuario_id']): ?>
                    <a href="perfil.php?id=<?= (int)$musica['usuario_id'] ?>"><?= e($musica['autor'] ?? 'Anônimo') ?></a>
                <?php else: ?>
                    <strong>Equipe CifraDog</strong>
                <?php endif; ?>
                · <i class="fa-regular fa-eye"></i> <?= (int)$musica['visualizacoes'] ?>
                · <?= estrelasHtml($musica['media_avaliacao']) ?> <small>(<?= (int)$musica['total_votos'] ?>)</small>
            </div>
        </div>

        <div class="musica-chips">
            <span class="chip chip-tom" title="Tom atual">Tom <b id="chip-tom"><?= e($musica['tom'] ?: '?') ?></b></span>
            <span class="chip chip-ouro" id="chip-capo-wrap" hidden title="Seu capotraste">Seu capo <b id="chip-capo"></b></span>
            <?php if ($musica['capo'] > 0): ?><span class="chip" title="O autor tocou com capotraste nesta casa">Capo do autor <b><?= (int)$musica['capo'] ?>ª</b></span><?php endif; ?>
            <?php if ($musica['bpm'] > 0): ?><span class="chip"><i class="fa-solid fa-drum"></i> <?= (int)$musica['bpm'] ?> BPM</span><?php endif; ?>
            <span class="chip dif-<?= e($musica['dificuldade']) ?>"><?= e(nomeDificuldade($musica['dificuldade'])) ?></span>
            <?php if ($musica['afinacao'] && $musica['afinacao'] !== 'Padrão'): ?><span class="chip"><i class="fa-solid fa-sliders"></i> <?= e($musica['afinacao']) ?></span><?php endif; ?>
            <?php if ($musica['genero']): ?><span class="chip"><?= e($musica['genero']) ?></span><?php endif; ?>
        </div>

        <div class="musica-acoes">
            <button class="btn btn-escuro <?= $ehFavorita ? 'favorito' : '' ?>" data-favoritar="<?= $id ?>" title="Favoritar">
                <i class="<?= $ehFavorita ? 'fa-solid' : 'fa-regular' ?> fa-heart"></i> <span class="fav-total"><?= $totalFavoritos ?></span>
            </button>
            <div class="menu-repertorio">
                <button class="btn btn-escuro" id="btn-add-rep"><i class="fa-solid fa-list-ol"></i> Repertório</button>
                <div class="popover" id="popover-rep" hidden>
                    <?php if (!$uid): ?>
                        <p class="popover-aviso"><a href="login.php?voltar=<?= urlencode($_SERVER['REQUEST_URI']) ?>">Entre</a> para montar repertórios.</p>
                    <?php else: ?>
                        <div class="popover-titulo">Adicionar a…</div>
                        <div id="lista-reps">
                            <?php foreach ($repertoriosUsuario as $r): ?>
                                <label class="check-linha"><input type="checkbox" data-rep="<?= (int)$r['id'] ?>" <?= $r['tem'] ? 'checked' : '' ?>> <?= e($r['nome']) ?></label>
                            <?php endforeach; ?>
                        </div>
                        <form id="form-novo-rep" class="linha-form">
                            <input type="text" maxlength="80" placeholder="Novo repertório…" required>
                            <button class="btn btn-ouro btn-pequeno" title="Criar"><i class="fa-solid fa-plus"></i></button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
            <button class="btn btn-escuro" id="btn-compartilhar" title="Copiar link"><i class="fa-solid fa-share-nodes"></i></button>
            <button class="btn btn-escuro" onclick="window.print()" title="Imprimir"><i class="fa-solid fa-print"></i></button>
            <?php if ($ehDono): ?>
                <a class="btn btn-contorno" href="editor.php?id=<?= $id ?>"><i class="fa-solid fa-pen"></i> Editar</a>
            <?php endif; ?>
        </div>
    </header>

    <div class="cifra-grade">
        <!-- ========== 3. Abas ========== -->
        <section class="cifra-coluna" data-abas-escopo>
            <nav class="abas" data-abas role="tablist">
                <button data-aba="cifra"><i class="fa-solid fa-guitar"></i> Cifra</button>
                <button data-aba="letra"><i class="fa-solid fa-align-left"></i> Letra</button>
                <button data-aba="acordes"><i class="fa-solid fa-hand"></i> Acordes <span class="aba-num" id="num-acordes"></span></button>
                <button data-aba="tablatura" id="aba-tab" hidden><i class="fa-solid fa-grip-lines"></i> Tablatura</button>
                <?php if ($videoEmbed): ?><button data-aba="video"><i class="fa-brands fa-youtube"></i> Vídeo</button><?php endif; ?>
                <button data-aba="comentarios"><i class="fa-regular fa-comments"></i> Comentários <span class="aba-num" id="num-coment"><?= count($comentarios) ?: '' ?></span></button>
            </nav>

            <!-- Aba: Cifra -->
            <div data-painel="cifra" class="painel">
                <div class="faixa-acordes" id="faixa-acordes" title="Clique num acorde para ver maior"></div>
                <div class="secoes-nav" id="secoes-nav"></div>
                <div class="cifra-saida" id="cifra-saida" aria-live="polite"></div>
            </div>

            <!-- Aba: Letra -->
            <div data-painel="letra" class="painel" hidden>
                <div class="cifra-saida letra-saida" id="letra-saida"></div>
            </div>

            <!-- Aba: Acordes -->
            <div data-painel="acordes" class="painel" hidden>
                <div class="acordes-topo">
                    <div class="segmentado" id="instrumento">
                        <button data-inst="violao" class="ativo"><i class="fa-solid fa-guitar"></i> Violão</button>
                        <button data-inst="teclado"><i class="fa-solid fa-keyboard"></i> Teclado</button>
                    </div>
                    <small>Os diagramas acompanham o tom, o capotraste e o modo simplificado.</small>
                </div>
                <div class="grade-acordes" id="grade-acordes"></div>
            </div>

            <!-- Aba: Tablatura (só aparece se a cifra tiver tablatura) -->
            <div data-painel="tablatura" class="painel" hidden>
                <div class="cifra-saida" id="tab-saida"></div>
            </div>

            <?php if ($videoEmbed): ?>
            <!-- Aba: Vídeo -->
            <div data-painel="video" class="painel" hidden>
                <div class="video-caixa">
                    <iframe src="<?= e($videoEmbed) ?>" title="Vídeo de <?= e($musica['titulo']) ?>" loading="lazy"
                            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            </div>
            <?php endif; ?>

            <!-- Aba: Comentários -->
            <div data-painel="comentarios" class="painel" hidden>
                <?php if ($uid): ?>
                    <form class="form-comentario" id="form-comentario">
                        <span class="avatar" style="background: <?= e(corAvatar($_SESSION['username'])) ?>"><?= e(iniciais($_SESSION['username'])) ?></span>
                        <textarea maxlength="<?= COMENTARIO_MAX_CARACTERES ?>" placeholder="Dica de batida, correção de acorde, elogio…" required></textarea>
                        <button class="btn btn-ouro">Comentar</button>
                    </form>
                <?php else: ?>
                    <p class="aviso-login"><a href="login.php?voltar=<?= urlencode($_SERVER['REQUEST_URI']) ?>">Entre na sua conta</a> para comentar.</p>
                <?php endif; ?>
                <div class="lista-comentarios" id="lista-comentarios">
                    <?php foreach ($comentarios as $c): ?>
                        <article class="comentario" data-id="<?= (int)$c['id'] ?>">
                            <span class="avatar" style="background: <?= e(corAvatar($c['username'])) ?>"><?= e(iniciais($c['username'])) ?></span>
                            <div>
                                <div class="comentario-topo">
                                    <a href="perfil.php?id=<?= (int)$c['usuario_id'] ?>"><?= e($c['username']) ?></a>
                                    <small><?= e(tempoRelativo($c['criado_em'])) ?></small>
                                    <?php if ((int)$c['usuario_id'] === $uid): ?>
                                        <button class="link-perigo" data-apagar-comentario="<?= (int)$c['id'] ?>">apagar</button>
                                    <?php endif; ?>
                                </div>
                                <p><?= nl2br(e($c['texto'])) ?></p>
                            </div>
                        </article>
                    <?php endforeach; ?>
                    <?php if (!$comentarios): ?><p class="vazio" id="sem-comentarios">Ninguém comentou ainda. Seja o primeiro!</p><?php endif; ?>
                </div>
            </div>
        </section>

        <!-- ========== 4. Ferramentas ========== -->
        <aside class="ferramentas" id="ferramentas">
            <button class="ferramentas-fechar" id="ferramentas-fechar" aria-label="Fechar ferramentas"><i class="fa-solid fa-xmark"></i></button>

            <div class="ferr-grupo">
                <div class="ferr-titulo">Tom</div>
                <div class="controle-tom">
                    <button class="btn-redondo" id="tom-menos" title="Meio tom abaixo (-)"><i class="fa-solid fa-minus"></i></button>
                    <div class="tom-display"><b id="tom-atual">?</b><small id="tom-diferenca">original</small></div>
                    <button class="btn-redondo" id="tom-mais" title="Meio tom acima (+)"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="linha-botoes">
                    <button class="btn btn-escuro btn-pequeno" id="tom-original"><i class="fa-solid fa-rotate-left"></i> Original</button>
                    <div class="segmentado segmentado-pequeno" id="acidentes" title="Sustenidos ou bemóis">
                        <button data-acid="auto" class="ativo">Auto</button><button data-acid="sus">♯</button><button data-acid="bem">♭</button>
                    </div>
                </div>
                <?php if ($rep): ?>
                    <button class="btn btn-contorno btn-pequeno btn-largo" id="salvar-tom-rep"><i class="fa-solid fa-floppy-disk"></i> Salvar este tom no repertório</button>
                <?php endif; ?>
            </div>

            <div class="ferr-grupo">
                <div class="ferr-titulo">Capotraste <button class="link-ouro" id="sugerir-capo">✨ sugerir</button></div>
                <div class="capo-trilho" id="capo-trilho"></div>
                <div class="capo-sugestao" id="capo-sugestao" hidden></div>
            </div>

            <div class="ferr-grupo">
                <div class="ferr-titulo">Exibição</div>
                <label class="chave"><input type="checkbox" id="op-simplificar"><span></span> Acordes simplificados</label>
                <label class="chave"><input type="checkbox" id="op-colunas"><span></span> Duas colunas</label>
                <label class="chave"><input type="checkbox" id="op-ocultar-tab"><span></span> Esconder tablaturas</label>
                <label class="chave"><input type="checkbox" id="op-faixa" checked><span></span> Faixa de acordes</label>
                <div class="linha-botoes">
                    <span class="rotulo">Fonte</span>
                    <button class="btn btn-escuro btn-pequeno" id="fonte-menos">A−</button>
                    <span id="fonte-valor">100%</span>
                    <button class="btn btn-escuro btn-pequeno" id="fonte-mais">A+</button>
                </div>
            </div>

            <div class="ferr-grupo">
                <div class="ferr-titulo">Rolagem automática</div>
                <div class="linha-botoes">
                    <button class="btn btn-ouro btn-pequeno" id="rolagem-botao"><i class="fa-solid fa-play"></i> Rolar</button>
                    <input type="range" id="rolagem-vel" min="1" max="10" value="4" aria-label="Velocidade">
                    <span id="rolagem-valor">4</span>
                </div>
            </div>

            <div class="ferr-grupo">
                <div class="ferr-titulo">Metrônomo</div>
                <div class="metronomo">
                    <div class="metro-luzes" id="metro-luzes"></div>
                    <div class="linha-botoes">
                        <button class="btn-redondo btn-redondo-pequeno" id="metro-menos">−</button>
                        <input type="number" id="metro-bpm" min="30" max="260" value="<?= (int)($musica['bpm'] ?: 90) ?>" aria-label="BPM">
                        <button class="btn-redondo btn-redondo-pequeno" id="metro-mais">+</button>
                        <select id="metro-compasso" aria-label="Compasso"><option value="4">4/4</option><option value="3">3/4</option><option value="2">2/4</option><option value="6">6/8</option></select>
                    </div>
                    <div class="linha-botoes">
                        <button class="btn btn-ouro btn-pequeno" id="metro-botao"><i class="fa-solid fa-play"></i> Tocar</button>
                        <button class="btn btn-escuro btn-pequeno" id="metro-tap" title="Toque no ritmo da música">Tap tempo</button>
                    </div>
                </div>
            </div>

            <div class="ferr-grupo">
                <button class="btn btn-contorno btn-largo" id="modo-palco"><i class="fa-solid fa-expand"></i> Modo palco <kbd>P</kbd></button>
            </div>

            <div class="ferr-grupo">
                <div class="ferr-titulo">Sua avaliação</div>
                <div class="avaliar" id="avaliar" data-nota="<?= $notaUsuario ?>">
                    <?php for ($i = 1; $i <= 5; $i++): ?>
                        <button data-nota="<?= $i ?>" aria-label="<?= $i ?> estrela(s)"><i class="fa-solid fa-star"></i></button>
                    <?php endfor; ?>
                </div>
                <small id="media-texto">Média <?= number_format((float)$musica['media_avaliacao'], 1, ',', '') ?> · <?= (int)$musica['total_votos'] ?> voto(s)</small>
            </div>

            <?php if (count($versoes) > 1): ?>
            <div class="ferr-grupo">
                <div class="ferr-titulo">Outras versões (<?= count($versoes) ?>)</div>
                <select onchange="location.href='cifra.php?id=' + this.value">
                    <?php foreach ($versoes as $v): ?>
                        <option value="<?= (int)$v['id'] ?>" <?= (int)$v['id'] === $id ? 'selected' : '' ?>>
                            <?= e($v['autor'] ?? 'Equipe CifraDog') ?> — ★ <?= number_format((float)$v['media_avaliacao'], 1, ',', '') ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>

            <button class="link-cinza" id="ver-atalhos"><i class="fa-regular fa-keyboard"></i> Atalhos do teclado (?)</button>
        </aside>
    </div>
</main>

<!-- ========== 5. Barra flutuante (celular e modo palco) ========== -->
<div class="barra-flutuante" id="barra-flutuante">
    <button id="bf-menos" title="Tom −"><i class="fa-solid fa-minus"></i></button>
    <span id="bf-tom">?</span>
    <button id="bf-mais" title="Tom +"><i class="fa-solid fa-plus"></i></button>
    <span class="bf-sep"></span>
    <button id="bf-rolar" title="Rolagem"><i class="fa-solid fa-play"></i></button>
    <button id="bf-lento" title="Mais devagar"><i class="fa-solid fa-backward"></i></button>
    <button id="bf-rapido" title="Mais rápido"><i class="fa-solid fa-forward"></i></button>
    <span class="bf-sep"></span>
    <button id="bf-ferramentas" class="so-celular" title="Ferramentas"><i class="fa-solid fa-sliders"></i></button>
    <button id="bf-sair-palco" class="so-palco" title="Sair do modo palco (Esc)"><i class="fa-solid fa-compress"></i></button>
</div>

<!-- Popover do acorde (aparece ao clicar num acorde) -->
<div class="popover-acorde" id="popover-acorde" hidden></div>

<!-- Janela de atalhos -->
<dialog class="janela" id="janela-atalhos">
    <h3>Atalhos do teclado</h3>
    <table class="tabela-atalhos">
        <tr><td><kbd>+</kbd> / <kbd>−</kbd></td><td>Subir / descer meio tom</td></tr>
        <tr><td><kbd>0</kbd></td><td>Voltar ao tom original</td></tr>
        <tr><td><kbd>Espaço</kbd></td><td>Liga / pausa a rolagem</td></tr>
        <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Rolagem mais rápida / devagar (com ela ligada)</td></tr>
        <tr><td><kbd>S</kbd></td><td>Acordes simplificados</td></tr>
        <tr><td><kbd>C</kbd></td><td>Duas colunas</td></tr>
        <tr><td><kbd>M</kbd></td><td>Metrônomo</td></tr>
        <tr><td><kbd>P</kbd></td><td>Modo palco (<kbd>Esc</kbd> sai)</td></tr>
        <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Música anterior / próxima (no repertório)</td></tr>
        <tr><td><kbd>1</kbd>…<kbd>6</kbd></td><td>Trocar de aba</td></tr>
    </table>
    <form method="dialog"><button class="btn btn-ouro">Fechar</button></form>
</dialog>

<?php
// Dados que o JavaScript precisa.
$dadosJs = [
    'musica' => [
        'id'     => (int)$musica['id'],
        'titulo' => $musica['titulo'],
        'tom'    => $musica['tom'],
        'capo'   => (int)$musica['capo'],
        'bpm'    => (int)$musica['bpm'],
        'cifra'  => $musica['cifra'],
    ],
    'repertorio' => $rep ? ['id' => (int)$rep['id'], 'semitons' => $repSemitons] : null,
    'notaUsuario' => $notaUsuario,
];
$scriptsExtras = ['assets/js/cifra-motor.js', 'assets/js/cifra-pagina.js'];
require __DIR__ . '/includes/rodape.php';
