<?php
require_once 'conexao.php';

$id_usuario = $_GET['id'] ?? null;

if (!$id_usuario) {
    die("Usuário não encontrado.");
}

$stmt = $pdo->prepare("SELECT username FROM usuarios WHERE id = ?");
$stmt->execute([$id_usuario]);
$dono = $stmt->fetch();

$stmt = $pdo->prepare("SELECT * FROM musicas WHERE usuario_id = ? ORDER BY id DESC");
$stmt->execute([$id_usuario]);
$musicas = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Perfil de <?php echo htmlspecialchars($dono['username']); ?></title>
    <link rel="stylesheet" href="style/cifra.css">
</head>
<body>

    <main class="perfil-container">
        
        <div class="perfil-header">
            <h1>Perfil de <?php echo htmlspecialchars($dono['username']); ?></h1>
            <p style="color: var(--text-gray);">Músico(a) cadastrado(a) no CifraDog</p>
        </div>

        <div class="secao-cifras">
            <h3>Cifras cadastradas</h3>
            
            <?php if (count($musicas) > 0): ?>
                <div class="lista-cifras">
                    <?php foreach ($musicas as $m): ?>
                        <div class="cifra-item">
                            <a href="cifra.php?id=<?php echo $m['id']; ?>">
                                <div class="cifra-info">
                                    <span class="titulo"><?php echo htmlspecialchars($m['titulo']); ?></span>
                                    <span class="artista"><?php echo htmlspecialchars($m['artista']); ?></span>
                                </div>
                            </a>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <p style="text-align:center; padding: 20px;">Este usuário ainda não cadastrou nenhuma cifra.</p>
            <?php endif; ?>
        </div>

        <div style="margin-top: 30px; text-align: center;">
            <a href="hub.php" style="color: var(--primary); text-decoration: none;">← Voltar ao Hub</a>
        </div>
        
    </main>
</body>
</html>