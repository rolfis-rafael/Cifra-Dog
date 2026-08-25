<?php
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($email) || empty($password)) {
        echo "<script>alert('Preencha todos os campos!'); window.location.href='cadastro.html';</script>";
        exit;
    }

    $senha_hash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare("INSERT INTO usuarios (username, email, senha) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $senha_hash]);
        echo "<script>alert('Cadastro realizado com sucesso! Faça login.'); window.location.href='login.html';</script>";
        exit;
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo "<script>alert('Usuário ou e-mail já cadastrado.'); window.location.href='cadastro.html';</script>";
        } else {
            echo "<script>alert('Erro no cadastro.'); window.location.href='cadastro.html';</script>";
        }
        exit;
    }
}
?>