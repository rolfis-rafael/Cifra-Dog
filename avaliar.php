<?php
session_start();
require_once 'conexao.php';

if (!isset($_SESSION['usuario_id'])) die("Acesso negado.");

$id_musica = $_GET['id'] ?? null;
$nota = (int)($_GET['nota'] ?? 0);

if ($id_musica && $nota >= 1 && $nota <= 5) {

    $stmt = $pdo->prepare("INSERT INTO avaliacoes (musica_id, usuario_id, nota) 
                           VALUES (?, ?, ?) 
                           ON DUPLICATE KEY UPDATE nota = ?");
    $stmt->execute([$id_musica, $_SESSION['usuario_id'], $nota, $nota]);
    
    $stmt = $pdo->prepare("UPDATE musicas SET 
                           media_avaliacao = (SELECT AVG(nota) FROM avaliacoes WHERE musica_id = ?),
                           total_votos = (SELECT COUNT(*) FROM avaliacoes WHERE musica_id = ?)
                           WHERE id = ?");
    $stmt->execute([$id_musica, $id_musica, $id_musica]);
}

header("Location: cifra.php?id=" . $id_musica);
?>