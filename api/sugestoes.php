<?php
/*
 * api/sugestoes.php — Sugestões da busca (usado pelo app.js enquanto digita)
 * Endereço: api/sugestoes.php?q=texto   (GET, não precisa de login)
 * Devolve: { musicas: [{id, titulo, artista}], artistas: [{artista, total}] }
 */
require_once __DIR__ . '/../includes/bootstrap.php';

$q = trim($_GET['q'] ?? '');
if (mb_strlen($q) < 2) {
    responderJson(['musicas' => [], 'artistas' => []]);
}
$termo = '%' . $q . '%';

// AJUSTAR: quantas sugestões de cada tipo aparecem.
$st = $pdo->prepare('SELECT id, titulo, artista FROM musicas
                     WHERE titulo LIKE ? OR artista LIKE ?
                     ORDER BY (titulo LIKE ?) DESC, visualizacoes DESC LIMIT 6');
$st->execute([$termo, $termo, $q . '%']);
$musicas = $st->fetchAll();

$st = $pdo->prepare('SELECT artista, COUNT(*) AS total FROM musicas
                     WHERE artista LIKE ? GROUP BY artista ORDER BY total DESC LIMIT 4');
$st->execute([$termo]);
$artistas = $st->fetchAll();

responderJson(['musicas' => $musicas, 'artistas' => $artistas]);
