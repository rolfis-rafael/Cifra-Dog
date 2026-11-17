<?php
/*
 * api/comentar.php — Cria ou apaga comentários de uma cifra
 * Recebe (JSON):
 *   { acao: 'criar',   musica_id, texto }
 *   { acao: 'excluir', id }            (só o autor do comentário pode apagar)
 */
require_once __DIR__ . '/../includes/bootstrap.php';

$dados = iniciarApi();
$acao = $dados['acao'] ?? '';
$uid = idUsuario();

if ($acao === 'criar') {
    $musicaId = (int)($dados['musica_id'] ?? 0);
    $texto = trim((string)($dados['texto'] ?? ''));
    if ($texto === '' || mb_strlen($texto) > COMENTARIO_MAX_CARACTERES) {
        responderJson(['ok' => false, 'erro' => 'O comentário precisa ter entre 1 e ' . COMENTARIO_MAX_CARACTERES . ' caracteres.'], 422);
    }
    $st = $pdo->prepare('SELECT COUNT(*) FROM musicas WHERE id = ?');
    $st->execute([$musicaId]);
    if (!$st->fetchColumn()) {
        responderJson(['ok' => false, 'erro' => 'Música não encontrada.'], 404);
    }
    $pdo->prepare('INSERT INTO comentarios (musica_id, usuario_id, texto) VALUES (?, ?, ?)')->execute([$musicaId, $uid, $texto]);
    $nome = $_SESSION['username'];
    responderJson(['ok' => true, 'comentario' => [
        'id' => (int)$pdo->lastInsertId(), 'texto' => $texto, 'usuario_id' => $uid,
        'username' => $nome, 'iniciais' => iniciais($nome), 'cor' => corAvatar($nome),
    ]]);
}

if ($acao === 'excluir') {
    $st = $pdo->prepare('DELETE FROM comentarios WHERE id = ? AND usuario_id = ?');
    $st->execute([(int)($dados['id'] ?? 0), $uid]);
    if (!$st->rowCount()) {
        responderJson(['ok' => false, 'erro' => 'Você só pode apagar seus próprios comentários.'], 403);
    }
    responderJson(['ok' => true]);
}

responderJson(['ok' => false, 'erro' => 'Ação desconhecida.'], 400);
