<?php
session_start();
require_once 'conexao.php';


error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', 0);


$username = $_SESSION['username'] ?? 'Visitante';
$search = trim($_GET['search'] ?? '');

$sql_base = "SELECT m.*, u.username AS nome_perfil 
             FROM musicas m 
             LEFT JOIN usuarios u ON m.usuario_id = u.id";

if (!empty($search)) {
    $stmt = $pdo->prepare($sql_base . " WHERE m.titulo LIKE ? OR m.artista LIKE ? ORDER BY m.id DESC");
    $stmt->execute(["%$search%", "%$search%"]);
} else {
    $stmt = $pdo->query($sql_base . " ORDER BY m.id DESC");
}
$musicas = $stmt->fetchAll();

//Sistema de estrela

function exibirEstrelas($media) {
    $html = "";
    $total_estrelas = 5;
    $media = round($media);

    for ($i = 1; $i <= $total_estrelas; $i++) {
        if ($i <= $media) {
            $html .= '<i class="fa-solid fa-star" style="color: #d9ae30;"></i>';
        } else {
            $html .= '<i class="fa-regular fa-star" style="color: #d9ae30;"></i>';
        }
    }
    return $html;
}

//Sistema de ordem

$ordem = $_GET['ordem'] ?? 'recentes';

$sql = "
    SELECT m.*, u.username AS nome_perfil
    FROM musicas m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
";

$params = [];
$where = [];

if (!empty($search)) {
    $where[] = "(m.titulo LIKE ? OR m.artista LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if ($ordem == 'facil') {
    $where[] = "m.dificuldade = 'facil'";
} elseif ($ordem == 'media') {
    $where[] = "m.dificuldade = 'media'";
} elseif ($ordem == 'dificil') {
    $where[] = "m.dificuldade = 'dificil'";
}

if (!empty($where)) {
    $sql .= " WHERE " . implode(" AND ", $where);
}

if ($ordem == 'melhores') {
    $sql .= " ORDER BY m.media_avaliacao DESC";
} else {
    $sql .= " ORDER BY m.id DESC";
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$musicas = $stmt->fetchAll();


?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style/hub.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title>Hub - CifraDog</title>
</head>
<body>

    <header class="navbar">
        <div class="nav-container">
            <a href="hub.php">
                <img src="img/cifardoglogotexto.png" alt="Logo CifraDog" class="nav-logo">
            </a>
            
            <form action="hub.php" method="GET" class="search-bar" id="meuFormulario"> 
                <input type="text" name="search" id="campo-busca" list="lista-sugestoes" 
                    oninput="buscarSugestoes(this.value)" 
                    placeholder="Pesquisar..." 
                    autocomplete="off">
                
                <datalist id="lista-sugestoes"></datalist>
                
                <button type="submit">Buscar</button>
            </form>
        

            <script>
                function buscarSugestoes(termo) {
                    if (termo.length < 2) {
                        document.getElementById('lista-sugestoes').innerHTML = '';
                        return;
                    }

                    fetch('buscar_sugestoes.php?q=' + encodeURIComponent(termo))
                        .then(response => response.text())
                        .then(html => {
                            document.getElementById('lista-sugestoes').innerHTML = html;
                        })
                        .catch(error => console.error('Erro na busca:', error));
                }
            </script>


            <nav class="nav-links">
                <a href="adicionar_musica.php" class="btn-add-music">Adicionar Música</a>
                
                <?php if (isset($_SESSION['usuario_id'])): ?>
                    <div class="user-menu">
                        <input type="checkbox" id="menu-check" class="menu-toggle">
                        <label for="menu-check" class="menu-trigger">Perfil ▼</label>
                        <div class="dropdown-menu">
                            <a href="perfil.php">Meu Perfil</a>
                            <a href="logout.php">Sair</a>
                        </div>
                    </div>
                <?php else: ?>
                    <a href="login.html" class="btn-login">ENTRAR</a>
                    <a href="cadastro.html" class="btn-cadastro">CADASTRE-SE</a>
                <?php endif; ?>
            </nav>
        </div>
    </header>

    <main class="main-container">
        <section class="hero-banner">
            <div class="hero-content">
                <span class="badge">Destaque do Dia</span>
                <h1>Bem vindo ao CIFRADOG, <?php echo htmlspecialchars($username); ?>!</h1>
                <p>Pratique as suas músicas favoritas e aumente o seu reportório.</p>
                <?php if (!empty($musicas)): ?>
                    <a href="cifra.php?id=<?php echo $musicas[0]['id']; ?>" class="btn-primary">Ver Cifra Aleatória</a>
                <?php endif; ?>
            </div>
        </section>

        <section class="section-container">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 class="section-title">Musicas da comunidade</h2>
                
                <form action="hub.php" method="GET" onchange="this.submit()">
                    <select name="ordem" style="padding: 8px; background: #252525; color: white; border: 1px solid #444; border-radius: 6px;">
                        <option value="recentes" <?php echo ($_GET['ordem'] ?? '') == 'recentes' ? 'selected' : ''; ?>>Mais recentes</option>
                        <option value="melhores" <?php echo ($_GET['ordem'] ?? '') == 'melhores' ? 'selected' : ''; ?>>Melhores avaliadas</option>
                        <option value="facil" <?php echo ($_GET['ordem'] ?? '') == 'facil' ? 'selected' : ''; ?>>Dificuldade: Fácil</option>
                        <option value="dificil" <?php echo ($_GET['ordem'] ?? '') == 'dificil' ? 'selected' : ''; ?>>Dificuldade: Difícil</option>
                    </select>
                    <input type="hidden" name="search" value="<?php echo htmlspecialchars($search); ?>">
                </form>
            </div>

            <div class="songs-list">
                <?php if (empty($musicas)): ?>
                    <p style="padding: 20px;">Nenhuma música encontrada. Que tal adicionar a primeira?</p>
                <?php else: ?>
                    <?php foreach ($musicas as $index => $musica): ?>
                        <div class="song-item">
                            <span class="song-rank"><?php echo $index + 1; ?></span>
                            <div class="song-info">
                                <span class="song-name" onclick="window.location.href='cifra.php?id=<?php echo $musica['id']; ?>'"><?php echo htmlspecialchars($musica['titulo']); ?></span>
                                <span class="song-artist"><?php echo htmlspecialchars($musica['artista']); ?></span>
                            </div>

                            <div class="song-rating" style="margin: 0 15px;">
                                <?php echo exibirEstrelas($musica['media_avaliacao']); ?>
                            </div>

                            <div class="song-badges" style="display: flex; align-items: center; gap: 10px;">
                                <div class="meta-item">
                                    <span class="meta-value"><?php echo ucfirst(htmlspecialchars($musica['dificuldade'])); ?></span>
                                </div>
                                <span style="font-size: 13px; color: #aaa;">
                                    <a href="perfil2.php?id=<?php echo $musica['usuario_id']; ?>" style="text-decoration: none; color: inherit;">
                                        por <strong><?php echo htmlspecialchars($musica['nome_perfil'] ?? 'Anônimo'); ?></strong>
                                    </a>
                                </span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2026 CifraDog - Todos os direitos reservados.</p>
    </footer>

</body>
</html>