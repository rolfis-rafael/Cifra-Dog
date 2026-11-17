<?php
/*
 * ============================================================
 *  hub.php — Página inicial: explorar as cifras
 * ============================================================
 *  Endereços aceitos (podem ser combinados):
 *    hub.php?aba=alta|recentes|melhores|iniciantes|favoritas
 *    hub.php?busca=texto        hub.php?artista=Nome
 *    hub.php?dificuldade=facil  hub.php?genero=Rock
 *    hub.php?pagina=2           hub.php?aleatoria=1  (abre uma cifra sorteada)
 *
 *  Partes:
 *   1. PHP: lê os filtros e monta a consulta (montarConsulta)
 *   2. PHP: dados da lateral (artistas, contribuidores, estatísticas)
 *   3. HTML: destaque (hero) com o mascote
 *   4. HTML: abas + filtros + lista de músicas
 *   5. HTML: lateral
 *
 *  ONDE: para criar uma aba nova, adicione em $abas e trate no switch de ordem.
 * ============================================================
 */
require_once __DIR__ . '/includes/bootstrap.php';

$uid = idUsuario();

// Botão "cifra aleatória": sorteia e redireciona.
if (!empty($_GET['aleatoria'])) {
    $idSorteado = $pdo->query('SELECT id FROM musicas ORDER BY RAND() LIMIT 1')->fetchColumn();
    redirecionar($idSorteado ? 'cifra.php?id=' . $idSorteado : 'hub.php');
}

// ---------- 1. Filtros ----------
// AJUSTAR: nomes e ícones das abas.
$abas = [
    'alta'       => ['Em alta', 'fa-fire'],
    'recentes'   => ['Recentes', 'fa-clock'],
    'melhores'   => ['Mais bem avaliadas', 'fa-star'],
    'iniciantes' => ['Para iniciantes', 'fa-seedling'],
];
if ($uid) {
    $abas['favoritas'] = ['Minhas favoritas', 'fa-heart'];
}

$aba         = isset($abas[$_GET['aba'] ?? '']) ? $_GET['aba'] : 'alta';
$busca       = trim($_GET['busca'] ?? '');
$artista     = trim($_GET['artista'] ?? '');
$dificuldade = in_array($_GET['dificuldade'] ?? '', ['facil', 'medio', 'dificil'], true) ? $_GET['dificuldade'] : '';
$genero      = trim($_GET['genero'] ?? '');
$pagina      = max(1, (int)($_GET['pagina'] ?? 1));

/* Monta o link do hub mantendo os filtros atuais e trocando só o que for passado em $mudar. */
function linkHub(array $mudar = []): string
{
    global $aba, $busca, $artista, $dificuldade, $genero;
    $params = array_merge(['aba' => $aba, 'busca' => $busca, 'artista' => $artista, 'dificuldade' => $dificuldade, 'genero' => $genero], $mudar);
    $params = array_filter($params, fn($v) => $v !== '' && $v !== null);
    return 'hub.php' . ($params ? '?' . http_build_query($params) : '');
}

$where = [];
$params = [];
if ($busca !== '') {
    $where[] = '(m.titulo LIKE ? OR m.artista LIKE ?)';
    $params[] = "%$busca%";
    $params[] = "%$busca%";
}
if ($artista !== '') {
    $where[] = 'm.artista = ?';
    $params[] = $artista;
}
if ($dificuldade !== '') {
    $where[] = 'm.dificuldade = ?';
    $params[] = $dificuldade;
}
if ($genero !== '') {
    $where[] = 'm.genero = ?';
    $params[] = $genero;
}
if ($aba === 'iniciantes') {
    $where[] = "m.dificuldade = 'facil'";
}
if ($aba === 'favoritas') {
    $where[] = 'EXISTS (SELECT 1 FROM favoritos f2 WHERE f2.musica_id = m.id AND f2.usuario_id = ' . $uid . ')';
}

// "Em alta" mistura visualizações, favoritos e votos.
// AJUSTAR: pesos do ranking "Em alta".
$ordens = [
    'alta'       => '(m.visualizacoes + favs * 8 + m.total_votos * 4) DESC, m.id DESC',
    'recentes'   => 'm.id DESC',
    'melhores'   => 'm.media_avaliacao DESC, m.total_votos DESC, m.id DESC',
    'iniciantes' => 'm.visualizacoes DESC, m.id DESC',
    'favoritas'  => 'm.titulo',
];

$sqlWhere = $where ? ' WHERE ' . implode(' AND ', $where) : '';
$st = $pdo->prepare('SELECT COUNT(*) FROM musicas m' . $sqlWhere);
$st->execute($params);
$totalResultados = (int)$st->fetchColumn();

$limite = ITENS_POR_PAGINA * $pagina; // "Ver mais" carrega mais itens na mesma página
$sql = 'SELECT m.id, m.titulo, m.artista, m.tom, m.dificuldade, m.media_avaliacao, m.total_votos,
               m.visualizacoes, m.usuario_id, m.genero, u.username AS autor,
               (SELECT COUNT(*) FROM favoritos f WHERE f.musica_id = m.id) AS favs,
               ' . ($uid ? '(SELECT COUNT(*) FROM favoritos f3 WHERE f3.musica_id = m.id AND f3.usuario_id = ' . $uid . ')' : '0') . ' AS minha_fav
        FROM musicas m LEFT JOIN usuarios u ON u.id = m.usuario_id' . $sqlWhere . '
        ORDER BY ' . $ordens[$aba] . ' LIMIT ' . (int)$limite;
$st = $pdo->prepare($sql);
$st->execute($params);
$musicas = $st->fetchAll();

// ---------- 2. Lateral e estatísticas ----------
$stats = $pdo->query('SELECT (SELECT COUNT(*) FROM musicas) AS cifras,
                             (SELECT COUNT(DISTINCT artista) FROM musicas) AS artistas,
                             (SELECT COUNT(*) FROM usuarios) AS musicos')->fetch();
$artistasTop = $pdo->query('SELECT artista, COUNT(*) AS total, SUM(visualizacoes) AS vis FROM musicas
                            GROUP BY artista ORDER BY vis DESC, total DESC LIMIT 8')->fetchAll();
$contribuidores = $pdo->query('SELECT u.id, u.username, COUNT(m.id) AS total FROM usuarios u
                               JOIN musicas m ON m.usuario_id = u.id
                               GROUP BY u.id ORDER BY total DESC LIMIT 5')->fetchAll();
$generos = $pdo->query("SELECT genero, COUNT(*) AS total FROM musicas WHERE genero IS NOT NULL AND genero <> ''
                        GROUP BY genero ORDER BY total DESC LIMIT 12")->fetchAll();
$meusReps = [];
if ($uid) {
    $st = $pdo->prepare('SELECT r.id, r.nome, (SELECT COUNT(*) FROM repertorio_itens i WHERE i.repertorio_id = r.id) AS total
                         FROM repertorios r WHERE r.usuario_id = ? ORDER BY r.id DESC LIMIT 5');
    $st->execute([$uid]);
    $meusReps = $st->fetchAll();
}

$filtrando = $busca !== '' || $artista !== '' || $dificuldade !== '' || $genero !== '';
$tituloPagina = ($artista ?: ($busca ? 'Busca: ' . $busca : 'Explorar')) . ' - CifraDog';
$paginaAtiva = 'hub';
require __DIR__ . '/includes/cabecalho.php';
?>

<main class="container">

    <?php if (!$filtrando): ?>
    <!-- ========== 3. Destaque ========== -->
    <section class="hero">
        <div class="hero-texto">
            <span class="selo"><i class="fa-solid fa-bolt"></i> Cifras da comunidade</span>
            <h1>
                <?php if ($uid): ?>E aí, <span class="ouro"><?= e($_SESSION['username']) ?></span>! Bora tocar?
                <?php else: ?>Toque. Transponha. <span class="ouro">Uive.</span><?php endif; ?>
            </h1>
            <p>Transposição inteligente, capotraste que se sugere sozinho, diagramas de acordes, metrônomo e repertórios para o seu show.</p>
            <div class="hero-botoes">
                <a href="hub.php?aleatoria=1" class="btn btn-ouro"><i class="fa-solid fa-shuffle"></i> Cifra aleatória</a>
                <a href="editor.php" class="btn btn-contorno"><i class="fa-solid fa-plus"></i> Enviar uma cifra</a>
            </div>
            <div class="hero-stats">
                <div><b><?= (int)$stats['cifras'] ?></b><span>cifras</span></div>
                <div><b><?= (int)$stats['artistas'] ?></b><span>artistas</span></div>
                <div><b><?= (int)$stats['musicos'] ?></b><span>músicos</span></div>
            </div>
        </div>
        <div class="hero-arte" aria-hidden="true">
            <div class="hero-brilho"></div>
            <img src="img/dog.png" alt="" class="hero-dog">
            <div class="hero-acorde hero-acorde-1" data-diagrama="Em"></div>
            <div class="hero-acorde hero-acorde-2" data-diagrama="G"></div>
            <div class="hero-acorde hero-acorde-3" data-diagrama="D/F#"></div>
        </div>
    </section>
    <?php else: ?>
    <section class="cabecalho-filtro">
        <div>
            <?php if ($artista): ?>
                <span class="selo"><i class="fa-solid fa-microphone"></i> Artista</span>
                <h1><?= e($artista) ?></h1>
            <?php elseif ($busca): ?>
                <span class="selo"><i class="fa-solid fa-magnifying-glass"></i> Busca</span>
                <h1>“<?= e($busca) ?>”</h1>
            <?php else: ?>
                <h1>Explorar</h1>
            <?php endif; ?>
            <p><?= $totalResultados ?> cifra(s) encontrada(s)</p>
        </div>
        <a class="btn btn-escuro btn-pequeno" href="hub.php"><i class="fa-solid fa-xmark"></i> Limpar filtros</a>
    </section>
    <?php endif; ?>

    <div class="hub-grade">
        <!-- ========== 4. Abas + lista ========== -->
        <section>
            <nav class="abas abas-links">
                <?php foreach ($abas as $chave => [$nome, $icone]): ?>
                    <a href="<?= e(linkHub(['aba' => $chave])) ?>" class="<?= $aba === $chave ? 'ativa' : '' ?>"><i class="fa-solid <?= $icone ?>"></i> <?= e($nome) ?></a>
                <?php endforeach; ?>
            </nav>

            <div class="filtros">
                <div class="filtro-chips">
                    <?php foreach (['' => 'Todas', 'facil' => 'Fácil', 'medio' => 'Médio', 'dificil' => 'Difícil'] as $cod => $nome): ?>
                        <a class="chip-filtro <?= $dificuldade === $cod ? 'ativo' : '' ?> <?= $cod ? 'dif-' . $cod : '' ?>" href="<?= e(linkHub(['dificuldade' => $cod])) ?>"><?= $nome ?></a>
                    <?php endforeach; ?>
                </div>
                <?php if ($generos): ?>
                    <div class="filtro-chips">
                        <?php foreach ($generos as $g): ?>
                            <a class="chip-filtro <?= $genero === $g['genero'] ? 'ativo' : '' ?>" href="<?= e(linkHub(['genero' => $genero === $g['genero'] ? '' : $g['genero']])) ?>">#<?= e($g['genero']) ?></a>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <div class="lista-musicas">
                <?php if (!$musicas): ?>
                    <div class="vazio-grande vazio-lista">
                        <img src="img/dog.png" alt="" class="dog-triste">
                        <h3><?= $aba === 'favoritas' ? 'Você ainda não favoritou nenhuma cifra' : 'Nenhuma cifra por aqui' ?></h3>
                        <p><?= $aba === 'favoritas' ? 'Toque no ❤ de uma cifra para guardar ela aqui.' : 'Que tal ser o primeiro a enviar?' ?></p>
                        <a class="btn btn-ouro" href="editor.php<?= $busca ? '?titulo=' . urlencode($busca) : '' ?>"><i class="fa-solid fa-plus"></i> Enviar cifra</a>
                    </div>
                <?php endif; ?>

                <?php foreach ($musicas as $i => $m): ?>
                    <article class="item-musica">
                        <span class="item-rank"><?= $i + 1 ?></span>
                        <a class="item-principal" href="cifra.php?id=<?= (int)$m['id'] ?>">
                            <span class="item-titulo"><?= e($m['titulo']) ?></span>
                            <span class="item-artista"><?= e($m['artista']) ?></span>
                        </a>
                        <div class="item-meta">
                            <?php if ($m['tom']): ?><span class="chip chip-tom-pequeno"><?= e($m['tom']) ?></span><?php endif; ?>
                            <span class="chip dif-<?= e($m['dificuldade']) ?>"><?= e(nomeDificuldade($m['dificuldade'])) ?></span>
                            <span class="item-estrelas"><?= estrelasHtml($m['media_avaliacao']) ?></span>
                            <span class="item-vis" title="Visualizações"><i class="fa-regular fa-eye"></i> <?= (int)$m['visualizacoes'] ?></span>
                        </div>
                        <div class="item-fim">
                            <?php if ($m['usuario_id']): ?>
                                <a class="item-autor" href="perfil.php?id=<?= (int)$m['usuario_id'] ?>" title="Enviada por <?= e($m['autor']) ?>">
                                    <span class="avatar avatar-mini" style="background: <?= e(corAvatar($m['autor'] ?? '?')) ?>"><?= e(iniciais($m['autor'] ?? '?')) ?></span>
                                </a>
                            <?php endif; ?>
                            <button class="btn-coracao <?= $m['minha_fav'] ? 'favorito' : '' ?>" data-favoritar="<?= (int)$m['id'] ?>" title="Favoritar">
                                <i class="<?= $m['minha_fav'] ? 'fa-solid' : 'fa-regular' ?> fa-heart"></i> <span class="fav-total"><?= (int)$m['favs'] ?></span>
                            </button>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>

            <?php if ($totalResultados > count($musicas)): ?>
                <div class="ver-mais">
                    <a class="btn btn-escuro" href="<?= e(linkHub(['pagina' => $pagina + 1])) ?>"><i class="fa-solid fa-chevron-down"></i> Ver mais (<?= $totalResultados - count($musicas) ?>)</a>
                </div>
            <?php endif; ?>
        </section>

        <!-- ========== 5. Lateral ========== -->
        <aside class="hub-lateral">
            <?php if ($uid): ?>
            <div class="cartao">
                <h3><i class="fa-solid fa-list-ol"></i> Seus repertórios</h3>
                <?php foreach ($meusReps as $r): ?>
                    <a class="lateral-linha" href="repertorio.php?id=<?= (int)$r['id'] ?>"><span><?= e($r['nome']) ?></span><small><?= (int)$r['total'] ?> músicas</small></a>
                <?php endforeach; ?>
                <?php if (!$meusReps): ?><p class="vazio">Monte setlists para seus ensaios e shows.</p><?php endif; ?>
                <a class="link-ouro" href="repertorio.php">Gerenciar repertórios →</a>
            </div>
            <?php endif; ?>

            <div class="cartao">
                <h3><i class="fa-solid fa-microphone"></i> Artistas</h3>
                <?php foreach ($artistasTop as $a): ?>
                    <a class="lateral-linha" href="hub.php?artista=<?= urlencode($a['artista']) ?>">
                        <span class="avatar avatar-mini" style="background: <?= e(corAvatar($a['artista'])) ?>"><?= e(iniciais($a['artista'])) ?></span>
                        <span><?= e($a['artista']) ?></span><small><?= (int)$a['total'] ?></small>
                    </a>
                <?php endforeach; ?>
            </div>

            <?php if ($contribuidores): ?>
            <div class="cartao">
                <h3><i class="fa-solid fa-trophy"></i> Quem mais contribui</h3>
                <?php foreach ($contribuidores as $pos => $c): ?>
                    <a class="lateral-linha" href="perfil.php?id=<?= (int)$c['id'] ?>">
                        <span class="medalha medalha-<?= $pos + 1 ?>"><?= $pos + 1 ?></span>
                        <span><?= e($c['username']) ?></span><small><?= (int)$c['total'] ?> cifras</small>
                    </a>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </aside>
    </div>
</main>

<?php
$scriptsExtras = ['assets/js/cifra-motor.js', 'assets/js/hub.js'];
require __DIR__ . '/includes/rodape.php';
