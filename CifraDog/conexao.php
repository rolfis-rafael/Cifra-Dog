<?php
$host = 'localhost';
$dbname = 'cifradog';
$user = 'root'; 
$pass = '';   
  
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro ao conectar com o banco de dados. Certifique-se de ter importado o arquivo banco.sql: " . $e->getMessage());
}
?>