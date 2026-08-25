<?php
session_start();
require_once 'conexao.php';

if (!isset($_SESSION['usuario_id'])) {
    header("Location: login.html");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $titulo = trim($_POST['titulo'] ?? '');
    $artista = trim($_POST['artista'] ?? '');
    $tom = trim($_POST['tom'] ?? '');
    $dificuldade = trim($_POST['dificuldade'] ?? 'medio');
    $cifra = trim($_POST['cifra'] ?? '');
    $bpm = $_POST['bpm'] ?? 0;
    
    $usuario_id = $_SESSION['usuario_id']; 

    try {

        $stmt = $pdo->prepare("INSERT INTO musicas (titulo, artista, tom, dificuldade, cifra, usuario_id, bpm) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$titulo, $artista, $tom, $dificuldade, $cifra, $usuario_id, $bpm]);
        echo "<script>alert('Música adicionada com sucesso!'); window.location.href='hub.php';</script>";
    } catch (PDOException $e) {
        echo "<script>alert('Erro ao salvar no banco de dados.'); window.history.back();</script>";
    }
}
?>