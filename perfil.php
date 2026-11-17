<?php
/*
 * ============================================================
 *  perfil.php — Perfil do usuário (substitui perfil.php + perfil2.php)
 * ============================================================
 *  Endereços: perfil.php             (o seu perfil)
 *             perfil.php?id=7        (perfil público de outra pessoa)
 *             perfil.php?aba=favoritas
 *
 *  Abas: Cifras | Favoritas (só no seu) | Repertórios (só no seu) | Configurações (só no seu)
 *  Partes: 1. PHP carrega dados · 2. PHP salva bio/instrumento · 3. HTML
 * ============================================================
 */
require_once __DIR__ . '/includes/bootstrap.php';

$uid = idUsuario();
$id = (int)($_GET['id'] ?? $uid);
if (!$id) {
    exigirLogin();
}
$ehMeu = $uid && $id === $uid;

$st = $pdo->prepare('SELECT id, username, email, bio, instrumento, criado_em FROM usuarios WHERE id = ?');
$st->execute([$id]);
$dono = $st->fetch();
if (!$dono) {
    http_response_code(404);
    $tituloPagina = 'Perfil não encontrado - CifraDog';
    require __DIR__ . '/includes/cabecalho.php';
    echo '<main class="container vazio-grande"><img src="img/dog.png" alt="" class="dog-triste"><h1>Usuário não encontrado</h1><a class="btn btn-ouro" href="hub.php">Voltar</a></main>';
    require __DIR__ . '/includes/rodape.php';
    exit;
}

// ---------- 2. Salvar configurações ----------
if ($ehMeu && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (validarCsrf()) {
        $pdo->prepare('UPDATE usuarios SET bio = ?, instrumento = ? WHERE id = ?')
            ->execute([mb_substr(trim($_POST['bio'] ?? ''), 0, 300) ?: null, mb_substr(trim($_POST['instrumento'] ?? ''), 0, 40) ?: null, $uid]);
        flash('Perfil atualizado!', 'sucesso');
    }
    redirecionar('perfil.php#config');
}

// ---------- 1. Dados ----------
$st = $pdo->prepare('SELECT m.id, m.titulo, m.artista, m.tom, m.dificuldade, m.media_avaliacao, m.visualizacoes,
                            (SELECT COUNT(*) FROM favoritos f WHERE f.musica_id = m.id) AS favs
                     FROM musicas m WHERE m.usuario_id = ? ORDER BY m.id DESC');
$st->execute([$id]);
$cifras = $st->fetchAll();
$totalVis = array_sum(array_column($cifras, 'visualizacoes'));
$totalFavs = array_sum(array_column($cifras, 'favs'));

$favoritas = [];
$reps = [];
if ($ehMeu) {
    $st = $pdo->prepare('SELECT m.id, m.titulo, m.artista, m.tom, m.dificuldade, m.media_avaliacao
                         FROM favoritos f JOIN musicas m ON m.id = f.musica_id WHERE f.usuario_id = ? ORDER BY f.criado_em DESC');
    $st->execute([$id]);
    $favoritas = $st->fetchAll();

    $st = $pdo->prepare('SELECT r.id, r.nome, COUNT(i.id) AS total FROM repertorios r
                         LEFT JOIN repertorio_itens i ON i.repertorio_id = r.id WHERE r.usuario_id = ? GROUP BY r.id ORDER BY r.id DESC');
    $st->execute([$id]);
    $reps = $st->fetchAll();
}

/* Desenha uma linha de música (usada nas abas Cifras e Favoritas). */
function linhaMusica(array $m, bool $editar = false): void
{
    echo '<article class="item-musica item-simples"><a class="item-principal" href="cifra.php?id=' . (int)$m['id'] . '">'
        . '<span class="item-titulo">' . e($m['titulo']) . '</span><span class="item-artista">' . e($m['artista']) . '</span></a>'
        . '<div class="item-meta">' . ($m['tom'] ? '<span class="chip chip-tom-pequeno">' . e($m['tom']) . '</span>' : '')
        . '<span class="chip dif-' . e($m['dificuldade']) . '">' . e(nomeDificuldade($m['dificuldade'])) . '</span>'
        . '<span class="item-estrelas">' . estrelasHtml($m['media_avaliacao']) . '</span></div>'
        . ($editar ? '<div class="item-fim"><a class="btn btn-escuro btn-pequeno" href="editor.php?id=' . (int)$m['id'] . '"><i class="fa-solid fa-pen"></i> Editar</a></div>' : '')
        . '</article>';
}

$tituloPagina = ($ehMeu ? 'Meu perfil' : 'Perfil de ' . $dono['username']) . ' - CifraDog';
$paginaAtiva = $ehMeu ? 'perfil' : '';
require __DIR__ . '/includes/cabecalho.php';
?>
<main class="container">
    <header class="perfil-topo">
        <span class="avatar avatar-grande" style="background: <?= e(corAvatar($dono['username'])) ?>"><?= e(iniciais($dono['username'])) ?></span>
        <div class="perfil-info">
            <h1><?= e($dono['username']) ?></h1>
            <div class="perfil-chips">
                <?php if ($dono['instrumento']): ?><span class="chip"><i class="fa-solid fa-guitar"></i> <?= e($dono['instrumento']) ?></span><?php endif; ?>
                <?php if ($dono['criado_em']): ?><span class="chip">Desde <?= e(date('m/Y', strtotime($dono['criado_em']))) ?></span><?php endif; ?>
            </div>
            <?php if ($dono['bio']): ?><p class="perfil-bio"><?= e($dono['bio']) ?></p><?php endif; ?>
        </div>
        <div class="hero-stats perfil-stats">
            <div><b><?= count($cifras) ?></b><span>cifras</span></div>
            <div><b><?= (int)$totalVis ?></b><span>visualizações</span></div>
            <div><b><?= (int)$totalFavs ?></b><span>❤ recebidos</span></div>
        </div>
    </header>

    <section data-abas-escopo>
        <nav class="abas" data-abas role="tablist">
            <button data-aba="cifras"><i class="fa-solid fa-guitar"></i> Cifras <span class="aba-num"><?= count($cifras) ?></span></button>
            <?php if ($ehMeu): ?>
                <button data-aba="favoritas"><i class="fa-solid fa-heart"></i> Favoritas <span class="aba-num"><?= count($favoritas) ?></span></button>
                <button data-aba="repertorios"><i class="fa-solid fa-list-ol"></i> Repertórios <span class="aba-num"><?= count($reps) ?></span></button>
                <button data-aba="config"><i class="fa-solid fa-gear"></i> Configurações</button>
            <?php endif; ?>
        </nav>

        <div data-painel="cifras" class="painel lista-musicas">
            <?php foreach ($cifras as $m) linhaMusica($m, $ehMeu); ?>
            <?php if (!$cifras): ?>
                <div class="vazio-grande vazio-lista"><img src="img/dog.png" alt="" class="dog-triste">
                    <h3><?= $ehMeu ? 'Você ainda não enviou nenhuma cifra' : 'Nenhuma cifra enviada ainda' ?></h3>
                    <?php if ($ehMeu): ?><a class="btn btn-ouro" href="editor.php"><i class="fa-solid fa-plus"></i> Enviar a primeira</a><?php endif; ?></div>
            <?php endif; ?>
        </div>

        <?php if ($ehMeu): ?>
        <div data-painel="favoritas" class="painel lista-musicas" hidden>
            <?php foreach ($favoritas as $m) linhaMusica($m); ?>
            <?php if (!$favoritas): ?><p class="vazio">Toque no ❤ de uma cifra para guardá-la aqui.</p><?php endif; ?>
        </div>

        <div data-painel="repertorios" class="painel" hidden>
            <div class="grade-cartoes">
                <?php foreach ($reps as $r): ?>
                    <a class="cartao cartao-rep" href="repertorio.php?id=<?= (int)$r['id'] ?>"><h3><?= e($r['nome']) ?></h3>
                        <span class="chip"><i class="fa-solid fa-music"></i> <?= (int)$r['total'] ?> música(s)</span></a>
                <?php endforeach; ?>
                <a class="cartao cartao-rep cartao-novo" href="repertorio.php"><i class="fa-solid fa-plus"></i> Novo repertório</a>
            </div>
        </div>

        <div data-painel="config" class="painel painel-form" hidden>
            <form method="POST" class="form-config">
                <?= csrfCampo() ?>
                <label class="campo"><span>E-mail (privado)</span><input type="text" value="<?= e($dono['email']) ?>" disabled></label>
                <label class="campo"><span>Instrumento principal</span>
                    <select name="instrumento"><option value="">—</option>
                    <?php foreach (['Violão', 'Guitarra', 'Baixo', 'Teclado', 'Ukulele', 'Bateria', 'Voz'] as $i): ?>
                        <option <?= $dono['instrumento'] === $i ? 'selected' : '' ?>><?= $i ?></option><?php endforeach; ?></select></label>
                <label class="campo"><span>Bio (até 300 caracteres)</span><textarea name="bio" maxlength="300" rows="3"><?= e($dono['bio']) ?></textarea></label>
                <button class="btn btn-ouro">Salvar</button>
            </form>
        </div>
        <?php endif; ?>
    </section>
</main>
<?php require __DIR__ . '/includes/rodape.php';
