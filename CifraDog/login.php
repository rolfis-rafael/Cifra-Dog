<?php
session_start();
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    try {
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['senha'])) {
            $_SESSION['usuario_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            header("Location: hub.php");
            exit;
        } else {
            echo "<script>alert('Usuário ou senha incorretos!'); window.location.href='login.html';</script>";
            exit;
        }
    } catch (PDOException $e) {
        echo "<script>alert('Erro no servidor!'); window.location.href='login.html';</script>";
        exit;
    }
}
?>