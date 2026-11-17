<?php
/*
 * ============================================================
 *  repertorio.php — Repertórios (setlists para ensaio e show)
 * ============================================================
 *  Endereços: repertorio.php          (lista dos seus repertórios + criar)
 *             repertorio.php?id=3     (um repertório: ordenar, tom de cada música, "Tocar")
 *
 *  Partes:
 *   1. PHP: lista ou detalhe, conforme o ?id=
 *   2. HTML lista: cartões + formulário de criar
 *   3. HTML detalhe: músicas arrastáveis, tom salvo por música, botão Tocar
 *
 *  Quem faz as ações (criar, ordenar, remover…) é o assets/js/repertorio.js
 *  chamando api/repertorio.php.
 * ============================================================
 */
require_once __DIR__ . '/includes/bootstrap.php';
exigirLogin();
$uid = idUsuario();
$id = (int)($_GET['id'] ?? 0);

// ---------- 1a. Detalhe de um repertório ----------
$rep = null;
$itens = [];
if ($id) {
    $st = $pdo->prepare('SELECT * FROM repertorios WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $rep = $st->fetch();
    if (!$rep) {
        flash('Repertório não encontrado.', 'erro');
        redirecionar('repertorio.php');
    }
    $st = $pdo->prepare('SELECT i.musica_id, i.semitons, m.titulo, m.artista, m.tom, m.bpm, m.dificuldade
                         FROM repertorio_itens i JOIN musicas m ON m.id = i.musica_id
                         WHERE i.repertorio_id = ? ORDER BY i.posicao, i.id');
    $st->execute([$id]);
    $itens = $st->fetchAll();
}

// ---------- 1b. Lista de repertórios ----------
$reps = [];
if (!$rep) {
    $st = $pdo->prepare('SELECT r.*, COUNT(i.id) AS total
                         FROM repertorios r LEFT JOIN repertorio_itens i ON i.repertorio_id = r.id
                         WHERE r.usuario_id = ? GROUP BY r.id ORDER BY r.id DESC');
    $st->execute([$uid]);
    $reps = $st->fetchAll();
}

$tituloPagina = ($rep ? $rep['nome'] : 'Repertórios') . ' - CifraDog';
$paginaAtiva = 'repertorios';
require __DIR__ . '/includes/cabecalho.php';
?>
<main class="container">
<?php if (!$rep): ?>
    <!-- ========== 2. Lista ========== -->
    <div class="editor-topo">
        <div><h1>Seus repertórios</h1><p class="sub">Monte a ordem do ensaio ou do show, com o tom de cada música já ajustado.</p></div>
    </div>

    <form class="linha-form linha-form-grande" id="form-criar-rep">
        <input type="text" maxlength="80" placeholder="Nome do novo repertório (ex.: Bar do Zé – sexta)" required>
        <button class="btn btn-ouro"><i class="fa-solid fa-plus"></i> Criar</button>
    </form>

    <div class="grade-cartoes">
        <?php foreach ($reps as $r): ?>
            <a class="cartao cartao-rep" href="repertorio.php?id=<?= (int)$r['id'] ?>">
                <h3><?= e($r['nome']) ?></h3>
                <?php if ($r['descricao']): ?><p><?= e($r['descricao']) ?></p><?php endif; ?>
                <span class="chip"><i class="fa-solid fa-music"></i> <?= (int)$r['total'] ?> música(s)</span>
            </a>
        <?php endforeach; ?>
        <?php if (!$reps): ?>
            <div class="vazio-grande vazio-lista">
                <img src="img/dog.png" alt="" class="dog-triste">
                <h3>Nenhum repertório ainda</h3>
                <p>Crie o primeiro acima, ou use o botão <b>Repertório</b> dentro de qualquer cifra.</p>
            </div>
        <?php endif; ?>
    </div>

<?php else: ?>
    <!-- ========== 3. Detalhe ========== -->
    <div class="editor-topo">
        <div>
            <a class="voltar" href="repertorio.php"><i class="fa-solid fa-arrow-left"></i> Repertórios</a>
            <h1 id="rep-titulo"><?= e($rep['nome']) ?></h1>
            <?php if ($rep['descricao']): ?><p class="sub"><?= e($rep['descricao']) ?></p><?php endif; ?>
        </div>
        <div class="linha-botoes">
            <?php if ($itens): ?>
                <a class="btn btn-ouro" href="cifra.php?id=<?= (int)$itens[0]['musica_id'] ?>&rep=<?= $id ?>"><i class="fa-solid fa-play"></i> Tocar o show</a>
            <?php endif; ?>
            <button class="btn btn-escuro" id="btn-renomear"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-perigo" id="btn-excluir-rep"><i class="fa-solid fa-trash"></i></button>
        </div>
    </div>

    <div class="rep-resumo">
        <span class="chip"><i class="fa-solid fa-music"></i> <?= count($itens) ?> músicas</span>
    </div>

    <ol class="lista-rep" id="lista-rep" data-rep="<?= $id ?>">
        <?php foreach ($itens as $i => $it): ?>
            <li class="rep-item" draggable="true" data-musica="<?= (int)$it['musica_id'] ?>">
                <span class="alca" title="Arraste para reordenar"><i class="fa-solid fa-grip-vertical"></i></span>
                <span class="item-rank"><?= $i + 1 ?></span>
                <a class="item-principal" href="cifra.php?id=<?= (int)$it['musica_id'] ?>&rep=<?= $id ?>">
                    <span class="item-titulo"><?= e($it['titulo']) ?></span>
                    <span class="item-artista"><?= e($it['artista']) ?></span>
                </a>
                <span class="chip chip-tom-pequeno" data-tom="<?= e($it['tom']) ?>" data-semitons="<?= (int)$it['semitons'] ?>" title="Tom no show"></span>
                <div class="rep-mover">
                    <button class="btn-redondo btn-redondo-pequeno" data-mover="-1" title="Subir"><i class="fa-solid fa-chevron-up"></i></button>
                    <button class="btn-redondo btn-redondo-pequeno" data-mover="1" title="Descer"><i class="fa-solid fa-chevron-down"></i></button>
                    <button class="btn-redondo btn-redondo-pequeno perigo" data-remover title="Tirar do repertório"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </li>
        <?php endforeach; ?>
    </ol>
    <?php if (!$itens): ?>
        <div class="vazio-grande vazio-lista">
            <img src="img/dog.png" alt="" class="dog-triste">
            <h3>Repertório vazio</h3>
            <p>Abra uma cifra, escolha o tom e toque em <b>Repertório</b> para adicioná-la aqui.</p>
            <a class="btn btn-ouro" href="hub.php">Explorar cifras</a>
        </div>
    <?php endif; ?>
<?php endif; ?>
</main>

<?php
$dadosJs = ['repertorioId' => $id, 'nomeRep' => $rep['nome'] ?? '', 'descRep' => $rep['descricao'] ?? ''];
$scriptsExtras = ['assets/js/cifra-motor.js', 'assets/js/repertorio.js'];
require __DIR__ . '/includes/rodape.php';
