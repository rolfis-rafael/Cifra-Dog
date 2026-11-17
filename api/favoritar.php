<?php
/*
 * api/favoritar.php — Liga/desliga uma música nas favoritas do usuário
 * Recebe (JSON): { musica_id }
 * Devolve: { ok, favorito: true/false, total }
 */
require_once __DIR__ . '/../includes/bootstrap.php';

$dados = iniciarApi();
$musicaId = (int)($dados['musica_id'] ?? 0);
$uid = idUsuario();

$st = $pdo->prepare('SELECT COUNT(*) FROM musicas WHERE id = ?');
$st->execute([$musicaId]);
if (!$st->fetchColumn()) {
    responderJson(['ok' => false, 'erro' => 'Música não encontrada.'], 404);
}

$st = $pdo->prepare('DELETE FROM favoritos WHERE usuario_id = ? AND musica_id = ?');
$st->execute([$uid, $musicaId]);
$favorito = false;
if ($st->rowCount() === 0) {
    // Não existia: então é para favoritar.
    $pdo->prepare('INSERT INTO favoritos (usuario_id, musica_id) VALUES (?, ?)')->execute([$uid, $musicaId]);
    $favorito = true;
}

$st = $pdo->prepare('SELECT COUNT(*) FROM favoritos WHERE musica_id = ?');
$st->execute([$musicaId]);
responderJson(['ok' => true, 'favorito' => $favorito, 'total' => (int)$st->fetchColumn()]);
