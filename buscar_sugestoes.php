<?php
require_once 'conexao.php';
$termo = $_GET['q'] ?? '';
$stmt = $pdo->prepare("SELECT titulo FROM musicas WHERE titulo LIKE ? LIMIT 5");
$stmt->execute(['%' . $termo . '%']);
while ($row = $stmt->fetch()) {
    echo '<option value="' . htmlspecialchars($row['titulo']) . '">';
}
?>