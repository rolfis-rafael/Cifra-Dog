<?php
/*
 * ============================================================
 *  editor.php — Criar e editar cifras (substitui adicionar_musica.php)
 * ============================================================
 *  Endereços: editor.php          (nova cifra)
 *             editor.php?id=5     (editar uma cifra SUA)
 *
 *  Partes:
 *   1. PHP: carrega a cifra (se for edição) e confere o dono
 *   2. PHP: salva (POST) ou apaga (POST acao=apagar)
 *   3. HTML: formulário com ABAS → Informações | Cifra | Extras
 *   4. HTML: pré-visualização ao vivo ao lado do texto
 *
 *  O JS (assets/js/editor.js) faz: pré-visualização, detectar tom,
 *  converter ChordPro, transpor o texto e inserir seções/acordes.
 * ============================================================
 */
require_once __DIR__ . '/includes/bootstrap.php';
exigirLogin();

$uid = idUsuario();
$id = (int)($_GET['id'] ?? 0);
$musica = null;

// ---------- 1. Carrega (edição) ----------
if ($id) {
    $st = $pdo->prepare('SELECT * FROM musicas WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $musica = $st->fetch();
    if (!$musica) {
        flash('Você só pode editar cifras enviadas por você.', 'erro');
        redirecionar('hub.php');
    }
}

// Valores iniciais do formulário (nova cifra aceita ?titulo= vindo da busca).
$v = $musica ?: [
    'titulo' => trim($_GET['titulo'] ?? ''), 'artista' => '', 'tom' => '', 'dificuldade' => 'medio',
    'bpm' => '', 'capo' => 0, 'afinacao' => 'Padrão', 'genero' => '', 'video_url' => '', 'cifra' => '',
];
$erros = [];

// ---------- 2. Salvar / apagar ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validarCsrf()) {
        $erros[] = 'Sessão expirada. Recarregue a página.';
    } elseif (($_POST['acao'] ?? '') === 'apagar' && $musica) {
        apagarMusica($pdo, $id);
        flash('Cifra apagada.', 'info');
        redirecionar('perfil.php');
    } else {
        $v = [
            'titulo'      => trim($_POST['titulo'] ?? ''),
            'artista'     => trim($_POST['artista'] ?? ''),
            'tom'         => normalizarTom($_POST['tom'] ?? ''),
            'dificuldade' => in_array($_POST['dificuldade'] ?? '', ['facil', 'medio', 'dificil'], true) ? $_POST['dificuldade'] : 'medio',
            'bpm'         => max(0, min(300, (int)($_POST['bpm'] ?? 0))),
            'capo'        => max(0, min(12, (int)($_POST['capo'] ?? 0))),
            'afinacao'    => mb_substr(trim($_POST['afinacao'] ?? 'Padrão'), 0, 40) ?: 'Padrão',
            'genero'      => mb_substr(trim($_POST['genero'] ?? ''), 0, 40),
            'video_url'   => trim($_POST['video_url'] ?? ''),
            'cifra'       => str_replace(["\r\n", "\r"], "\n", (string)($_POST['cifra'] ?? '')),
        ];
        $v['cifra'] = rtrim($v['cifra']);

        if ($v['titulo'] === '' || mb_strlen($v['titulo']) > 100) $erros[] = 'Título: de 1 a 100 caracteres.';
        if ($v['artista'] === '' || mb_strlen($v['artista']) > 100) $erros[] = 'Artista: de 1 a 100 caracteres.';
        if ($v['cifra'] === '') $erros[] = 'A cifra está vazia.';
        if (mb_strlen($v['cifra']) > CIFRA_MAX_CARACTERES) $erros[] = 'Cifra muito grande (máximo ' . CIFRA_MAX_CARACTERES . ' caracteres).';
        if ($v['video_url'] !== '' && !linkYoutubeEmbed($v['video_url'])) $erros[] = 'O link do vídeo precisa ser do YouTube.';
        if (trim($_POST['tom'] ?? '') !== '' && $v['tom'] === '') $erros[] = 'Tom inválido. Exemplos: C, Am, F#m, Bb.';

        if (!$erros) {
            $campos = [$v['titulo'], $v['artista'], $v['tom'] ?: '?', $v['dificuldade'], $v['cifra'], $v['bpm'], $v['capo'],
                       $v['afinacao'], $v['genero'] ?: null, $v['video_url'] ?: null];
            if ($musica) {
                $pdo->prepare('UPDATE musicas SET titulo=?, artista=?, tom=?, dificuldade=?, cifra=?, bpm=?, capo=?,
                               afinacao=?, genero=?, video_url=?, atualizado_em=NOW() WHERE id=? AND usuario_id=?')
                    ->execute(array_merge($campos, [$id, $uid]));
                flash('Cifra atualizada!', 'sucesso');
                redirecionar('cifra.php?id=' . $id);
            }
            $pdo->prepare('INSERT INTO musicas (titulo, artista, tom, dificuldade, cifra, bpm, capo, afinacao, genero, video_url, usuario_id)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                ->execute(array_merge($campos, [$uid]));
            flash('Cifra publicada! 🎸', 'sucesso');
            redirecionar('cifra.php?id=' . $pdo->lastInsertId());
        }
    }
}

$tituloPagina = ($musica ? 'Editar ' . $musica['titulo'] : 'Nova cifra') . ' - CifraDog';
$paginaAtiva = $musica ? '' : 'nova';
$classeBody = 'pagina-editor';
require __DIR__ . '/includes/cabecalho.php';

// Exemplo que aparece no campo vazio, para ensinar o formato.
$exemplo = "[Intro] Am  F  C  G\n\n[Primeira Parte]\nAm              F\n  Letra da música aqui\nC               G\n  Segunda linha da letra";
?>
<main class="container">
    <div class="editor-topo">
        <h1><?= $musica ? 'Editar cifra' : 'Nova cifra' ?></h1>
        <a class="btn btn-escuro btn-pequeno" href="<?= $musica ? 'cifra.php?id=' . $id : 'hub.php' ?>"><i class="fa-solid fa-arrow-left"></i> Voltar</a>
    </div>

    <?php foreach ($erros as $erro): ?><div class="alerta alerta-erro"><?= e($erro) ?></div><?php endforeach; ?>

    <form method="POST" id="form-editor" class="editor" data-abas-escopo>
        <?= csrfCampo() ?>

        <!-- ========== 3. Abas do formulário ========== -->
        <nav class="abas" data-abas role="tablist">
            <button type="button" data-aba="info"><i class="fa-solid fa-circle-info"></i> Informações</button>
            <button type="button" data-aba="cifra"><i class="fa-solid fa-guitar"></i> Cifra</button>
            <button type="button" data-aba="extras"><i class="fa-solid fa-sliders"></i> Extras</button>
        </nav>

        <div data-painel="info" class="painel painel-form">
            <div class="grade-2">
                <label class="campo"><span>Título *</span><input type="text" name="titulo" id="f-titulo" maxlength="100" required value="<?= e($v['titulo']) ?>"></label>
                <label class="campo"><span>Artista *</span><input type="text" name="artista" id="f-artista" maxlength="100" required value="<?= e($v['artista']) ?>" list="lista-artistas"></label>
            </div>
            <div class="grade-3">
                <label class="campo"><span>Tom</span>
                    <div class="campo-com-botao"><input type="text" name="tom" id="f-tom" maxlength="10" placeholder="Ex.: Am" value="<?= e($v['tom'] === '?' ? '' : $v['tom']) ?>">
                    <button type="button" class="btn btn-escuro btn-pequeno" data-detectar-tom title="Descobrir pelos acordes">✨ Detectar</button></div></label>
                <label class="campo"><span>Dificuldade</span>
                    <select name="dificuldade"><?php foreach (['facil' => 'Fácil', 'medio' => 'Médio', 'dificil' => 'Difícil'] as $c => $n): ?>
                        <option value="<?= $c ?>" <?= $v['dificuldade'] === $c ? 'selected' : '' ?>><?= $n ?></option><?php endforeach; ?></select></label>
                <label class="campo"><span>Gênero</span><input type="text" name="genero" maxlength="40" placeholder="Rock, Sertanejo, MPB…" value="<?= e($v['genero']) ?>"></label>
            </div>
            <button type="button" class="btn btn-ouro" data-ir-aba="cifra">Próximo: escrever a cifra <i class="fa-solid fa-arrow-right"></i></button>
        </div>

        <div data-painel="cifra" class="painel painel-form" hidden>
            <div class="editor-ferramentas">
                <div class="ferr-linha">
                    <span class="rotulo">Inserir seção:</span>
                    <?php foreach (['Intro', 'Primeira Parte', 'Pré-Refrão', 'Refrão', 'Ponte', 'Solo', 'Final'] as $s): ?>
                        <button type="button" class="chip-botao" data-secao="<?= e($s) ?>">[<?= e($s) ?>]</button>
                    <?php endforeach; ?>
                </div>
                <div class="ferr-linha">
                    <span class="rotulo">Transpor texto:</span>
                    <button type="button" class="btn btn-escuro btn-pequeno" data-transpor="-1">−½ tom</button>
                    <button type="button" class="btn btn-escuro btn-pequeno" data-transpor="1">+½ tom</button>
                    <span class="separador"></span>
                    <button type="button" class="btn btn-escuro btn-pequeno" data-detectar-tom title="Descobrir o tom pelos acordes">✨ Detectar tom</button>
                    <button type="button" class="btn btn-escuro btn-pequeno" id="btn-chordpro" title="Converte [C]letra para acordes em cima da letra">Converter ChordPro</button>
                    <button type="button" class="btn btn-escuro btn-pequeno" id="btn-colar-exemplo">Ver exemplo</button>
                </div>
            </div>

            <div class="editor-duplo">
                <div class="editor-lado">
                    <label class="rotulo" for="f-cifra">Cifra (acordes numa linha, letra na de baixo)</label>
                    <textarea name="cifra" id="f-cifra" spellcheck="false" required
                              placeholder="<?= e($exemplo) ?>"><?= e($v['cifra']) ?></textarea>
                    <div class="editor-rodape"><span id="contagem">0 caracteres</span><span id="aviso-detectado"></span></div>
                </div>
                <div class="editor-lado">
                    <div class="rotulo">Pré-visualização</div>
                    <div class="cifra-saida editor-previa" id="previa"></div>
                    <div class="faixa-acordes" id="previa-acordes"></div>
                </div>
            </div>
            <p class="dica">Dica: use <code>[Refrão]</code> numa linha sozinha para criar seções e linhas com <code>e|---0---3---|</code> para tablatura. As abas <b>Letra</b>, <b>Acordes</b> e <b>Tablatura</b> da cifra são geradas sozinhas.</p>
        </div>

        <div data-painel="extras" class="painel painel-form" hidden>
            <div class="grade-3">
                <label class="campo"><span>BPM</span><input type="number" name="bpm" min="0" max="300" placeholder="Ex.: 120" value="<?= $v['bpm'] ? (int)$v['bpm'] : '' ?>"></label>
                <label class="campo"><span>Capotraste que você usa</span>
                    <select name="capo"><?php for ($c = 0; $c <= 12; $c++): ?><option value="<?= $c ?>" <?= (int)$v['capo'] === $c ? 'selected' : '' ?>><?= $c ? $c . 'ª casa' : 'Sem capo' ?></option><?php endfor; ?></select></label>
                <label class="campo"><span>Afinação</span>
                    <select name="afinacao"><?php foreach (['Padrão', 'Meio tom abaixo', 'Tom abaixo', 'Drop D', 'DADGAD', 'Open G', 'Outra'] as $a): ?>
                        <option <?= $v['afinacao'] === $a ? 'selected' : '' ?>><?= $a ?></option><?php endforeach; ?></select></label>
            </div>
            <label class="campo"><span>Vídeo do YouTube (aparece na aba Vídeo)</span>
                <input type="url" name="video_url" placeholder="https://www.youtube.com/watch?v=…" value="<?= e($v['video_url']) ?>"></label>
        </div>

        <div class="editor-acoes">
            <button class="btn btn-ouro"><i class="fa-solid fa-check"></i> <?= $musica ? 'Salvar alterações' : 'Publicar cifra' ?></button>
            <?php if ($musica): ?>
                <button type="submit" name="acao" value="apagar" class="btn btn-perigo" formnovalidate
                        onclick="return confirm('Apagar esta cifra para sempre? Avaliações e comentários dela também somem.')"><i class="fa-solid fa-trash"></i> Apagar</button>
            <?php endif; ?>
        </div>
    </form>
</main>

<?php
$st = $pdo->query('SELECT DISTINCT artista FROM musicas ORDER BY artista LIMIT 300');
echo '<datalist id="lista-artistas">';
foreach ($st as $a) echo '<option value="' . e($a['artista']) . '">';
echo '</datalist>';

$scriptsExtras = ['assets/js/cifra-motor.js', 'assets/js/editor.js'];
require __DIR__ . '/includes/rodape.php';
