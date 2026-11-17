<?php
/*
 * api/avaliar.php — Dá (ou troca) a nota de 1 a 5 estrelas de uma música
 * Recebe (JSON): { musica_id, nota }
 * Devolve: { ok, media, total }
 */
require_once __DIR__ . '/../includes/bootstrap.php';

$dados = iniciarApi();
$musicaId = (int)($dados['musica_id'] ?? 0);
$nota = (int)($dados['nota'] ?? 0);

if ($nota < 1 || $nota > 5) {
    responderJson(['ok' => false, 'erro' => 'Nota inválida.'], 422);
}
$st = $pdo->prepare('SELECT COUNT(*) FROM musicas WHERE id = ?');
$st->execute([$musicaId]);
if (!$st->fetchColumn()) {
    responderJson(['ok' => false, 'erro' => 'Música não encontrada.'], 404);
}

// Se o usuário já votou, só troca a nota (chave única musica_id + usuario_id).
$pdo->prepare('INSERT INTO avaliacoes (musica_id, usuario_id, nota) VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE nota = VALUES(nota)')
    ->execute([$musicaId, idUsuario(), $nota]);

// Recalcula a média guardada na própria música (deixa o Hub rápido para ordenar).
$st = $pdo->prepare('SELECT COALESCE(AVG(nota), 0) AS media, COUNT(*) AS total FROM avaliacoes WHERE musica_id = ?');
$st->execute([$musicaId]);
$r = $st->fetch();
$pdo->prepare('UPDATE musicas SET media_avaliacao = ?, total_votos = ? WHERE id = ?')
    ->execute([round((float)$r['media'], 2), (int)$r['total'], $musicaId]);

responderJson(['ok' => true, 'media' => round((float)$r['media'], 2), 'total' => (int)$r['total']]);
