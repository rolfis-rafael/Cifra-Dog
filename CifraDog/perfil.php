<?php
session_start();
require_once 'conexao.php';

if (!isset($_SESSION['usuario_id'])) {
    header("Location: login.html");
    exit;
}

$stmt = $pdo->prepare("
    SELECT username, email
    FROM usuarios
    WHERE id = ?
");
$stmt->execute([$_SESSION['usuario_id']]);
$usuario = $stmt->fetch();

$stmt = $pdo->prepare("
    SELECT *
    FROM musicas
    WHERE usuario_id = ?
    ORDER BY id DESC
");
$stmt->execute([$_SESSION['usuario_id']]);
$minhas_musicas = $stmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Meu Perfil - CifraDog</title>
</head>
    
<body>

    <main class="perfil-container">

        <div class="perfil-header" style="text-align: left; margin-bottom: 30px;">
            <h1>
                Perfil de <?php echo htmlspecialchars($usuario['username']); ?>
            </h1>

            <p style="color: #aaa;">
                Email: <?php echo htmlspecialchars($usuario['email']); ?>
            </p>
        </div>

        <div class="secao-cifras">
            <h3>Minhas Cifras</h3>

            <?php if (count($minhas_musicas) > 0): ?>

                <table class="tabela-hub">
                    <thead>
                        <tr>
                            <th>Música</th>
                            <th>Artista</th>
                            <th style="text-align: right;">Ação</th>
                        </tr>
                    </thead>

                    <tbody>
                        <?php foreach ($minhas_musicas as $m): ?>

                            <tr>
                                <td class="col-titulo">
                                    <a href="cifra.php?id=<?php echo $m['id']; ?>">
                                        <?php echo htmlspecialchars($m['titulo']); ?>
                                    </a>
                                </td>

                                <td class="col-artista">
                                    <?php echo htmlspecialchars($m['artista']); ?>
                                </td>

                                <td style="text-align: right;">
                                    <a href="cifra.php?id=<?php echo $m['id']; ?>" class="btn-acessar">
                                        Tocar
                                    </a>
                                </td>
                            </tr>

                        <?php endforeach; ?>
                    </tbody>
                </table>

            <?php else: ?>

                <div style="
                    background: #252525;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                ">
                    <p style="color: #aaa;">
                        Você ainda não cadastrou nenhuma cifra.
                    </p>
                </div>

            <?php endif; ?>
        </div>

        <div style="margin-top: 30px;">
            <a href="hub.php" style="
                color: var(--primary);
                text-decoration: none;
            ">
                ← Voltar ao Hub
            </a>
        </div>

    </main>

    <style>

        body{
            background: #33312B;
        }
                
        .perfil-container {
            max-width: 1100px;
            margin: 40px auto;
            padding: 30px;
            color: #fff;
        }

        
        .perfil-header {
            background: linear-gradient(135deg, #1f1f1f, #2e2e2e);
            padding: 30px;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .perfil-header h1 {
            margin: 0;
            font-size: 2rem;
        }

        .perfil-header p {
            margin-top: 10px;
            color: #b0b0b0;
        }

        
        .secao-cifras {
            background: #1c1c1c;
            padding: 25px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .secao-cifras h3 {
            margin-bottom: 20px;
            font-size: 1.5rem;
            border-left: 4px solid #ff8c00;
            padding-left: 12px;
        }

        .tabela-hub {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 12px;
        }

        .tabela-hub thead {
            background: #2c2c2c;
        }

        .tabela-hub th {
            padding: 16px;
            text-align: left;
            color: #ddd;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
        }

        .tabela-hub td {
            padding: 18px 16px;
            border-top: 1px solid #333;
        }

        .tabela-hub tbody tr {
            transition: 0.2s;
        }

        .tabela-hub tbody tr:hover {
            background: #262626;
        }

        .col-titulo a {
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
        }

        .col-titulo a:hover {
            color: #ff8c00;
        }

        .col-artista {
            color: #b0b0b0;
        }


        .btn-acessar {
            display: inline-block;
            background: #ff8c00;
            color: white;
            text-decoration: none;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: bold;
            transition: 0.2s;
        }

        .btn-acessar:hover {
            background: #ff9d26;
            transform: translateY(-2px);
        }

        .sem-musicas {
            background: #252525;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            color: #aaa;
        }

        .voltar-hub {
            display: inline-block;
            margin-top: 25px;
            color: #ff8c00;
            text-decoration: none;
            font-weight: bold;
            transition: 0.2s;
        }

        .voltar-hub:hover {
            color: #ff9d26;
        }
    </style>

</body>
</html>