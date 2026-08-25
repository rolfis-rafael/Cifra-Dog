<?php
session_start();
require_once 'conexao.php';

if (!isset($_SESSION['usuario_id'])) {
    header("Location: login.html");
    exit;
}

$id = intval($_GET['id'] ?? 0);

$stmt = $pdo->prepare("SELECT m.*, u.username AS nome_perfil 
                       FROM musicas m 
                       LEFT JOIN usuarios u ON m.usuario_id = u.id 
                       WHERE m.id = ?");
$stmt->execute([$id]);
$musica = $stmt->fetch();

function colorirAcordes($cifra) {
    $linhas = explode("\n", $cifra);
    $resultado = [];

    foreach ($linhas as $linha) {
        if (preg_match('/^[EADGBe]\|/', ltrim($linha))) {
            $resultado[] = $linha;
            continue;
        }

        $padrao = '/(?<!\w)([A-G](?:#|b)?(?:m|M|maj|min|aug|dim|sus|add9?|maj7|m7|7M|[0-9]*)?(?:\/[A-G](?:#|b)?)?)(?!\w)/';

        $linha = preg_replace_callback($padrao, function($matches) {
            $acorde = $matches[0];
            $excecoes = ['E', 'O', 'I', 'U'];
            if (strlen($acorde) === 1 && in_array($acorde, $excecoes)) {
                return $acorde;
            }
            return '<span class="acorde">' . $acorde . '</span>';
        }, $linha);

        $resultado[] = $linha;
    }

    return implode("\n", $resultado);
}

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

if (!$musica) {
    die("<h2 style='color:white; text-align:center; padding:50px;'>Música não encontrada! <br><br><a href='hub.php' style='color:#D9AE30;'>Voltar ao Hub</a></h2>");
}

$stmt_versoes = $pdo->prepare("SELECT m.id, u.username AS nome_perfil 
                               FROM musicas m 
                               LEFT JOIN usuarios u ON m.usuario_id = u.id 
                               WHERE m.titulo = ? AND m.artista = ?");
$stmt_versoes->execute([$musica['titulo'], $musica['artista']]);
$versoes = $stmt_versoes->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style/cifra.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <title><?php echo htmlspecialchars($musica['titulo']); ?> - CifraDog</title>
</head>
<body>

    <header class="navbar">
        <div class="nav-container">
            <a href="hub.php"><img src="img/cifardoglogotexto.png" alt="Logo CifraDog" class="nav-logo"></a>
            <div class="search-bar">
                <input type="text" placeholder="Buscar música..." onclick="window.location.href='hub.php'">
                <button type="button" onclick="window.location.href='hub.php'">Buscar</button>
            </div>
            <nav class="nav-links">
                <a href="adicionar_musica.php" class="btn-add-music">Adicionar Música</a>
                <div class="user-menu">
                    <input type="checkbox" id="menu-check" class="menu-toggle">
                    <label for="menu-check" class="menu-trigger">Perfil ▼</label>
                    <div class="dropdown-menu">
                        <a href="perfil.php">Meu Perfil</a>
                        <a href="logout.php" class="logout-btn">Sair</a>
                    </div>
                </div>
            </nav>
        </div>
    </header>

    <main class="cifra-main">
        <header class="song-header">
            <div class="song-title-area">
                <h1><?php echo htmlspecialchars($musica['titulo']); ?></h1>
                <h2><a href="#"><?php echo htmlspecialchars($musica['artista']); ?></a></h2>
                <p style="color: var(--text-gray); font-size: 14px; margin-top: 10px;">
                    Cifra enviada por: <strong style="color: var(--primary);"><?php echo htmlspecialchars($musica['nome_perfil'] ?? 'Equipe CifraDog'); ?></strong>
                </p>
            </div>
            <div class="song-meta">
                <div class="meta-item">
                    <span class="meta-label">Tom:</span>
                    <span class="meta-value" id="song-key"><?php echo htmlspecialchars($musica['tom']); ?></span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Dificuldade:</span>
                    <span class="meta-value"><?php echo ucfirst(htmlspecialchars($musica['dificuldade'])); ?></span>
                </div>
            </div>
        </header>

        <div class="cifra-container">
            <section class="cifra-content">
                <div class="cifra-text">
                    <pre id="cifra-texto"><?php echo colorirAcordes($musica['cifra']); ?></pre>
                </div>
            </section>

            <aside class="cifra-sidebar">
                <div class="tools-card">
                    <h3>Ferramentas</h3>
                    
                    <?php if (count($versoes) > 1): ?>
                    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <label style="font-size: 12px; color: var(--text-gray); display:block; margin-bottom:8px; text-transform: uppercase;">Outras Versões:</label>
                        <select onchange="window.location.href='cifra.php?id=' + this.value;" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-input); color: white; border: 1px solid var(--text-gray); outline: none;">
                            <?php foreach($versoes as $v): ?>
                                <option value="<?php echo $v['id']; ?>" <?php echo ($v['id'] == $id) ? 'selected' : ''; ?>>
                                    Versão de <?php echo htmlspecialchars($v['nome_perfil'] ?? 'Equipe CifraDog'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <?php endif; ?>

                    <?php
                    $check = $pdo->prepare("SELECT nota FROM avaliacoes WHERE musica_id = ? AND usuario_id = ?");
                    $check->execute([$musica['id'], $_SESSION['usuario_id']]);
                    $nota_usuario = $check->fetchColumn();
                    ?>

                    <div class="sistema-avaliacao">
                        <p>Sua avaliação:</p>
                        <div class="stars-container">
                            <?php for ($i = 5; $i >= 1; $i--): ?>
                                <a href="avaliar.php?id=<?php echo $musica['id']; ?>&nota=<?php echo $i; ?>" class="star-link">
                                    <i class="fa-star <?php echo ($nota_usuario && $i <= $nota_usuario) ? 'fa-solid' : 'fa-regular'; ?>" style="color: #d9ae30; font-size: 24px;"></i>
                                </a>
                            <?php endfor; ?>
                        </div>
                    </div>
                    <br>

                    <div class="cifra-meta">
                        <span class="meta-item">
                            <i class="fa-regular fa-clock" style="color: #d9ae30;"></i>
                            <?php echo $musica['bpm'] > 0 ? $musica['bpm'] . " BPM" : "BPM não definido"; ?>
                        </span>
                    </div>

                    <div class="transposicao-controls">
                        <button onclick="transpor(-1)">- Tom</button>
                        <button class="btn-reset" onclick="resetarTom()">↺ Original</button>
                        <button onclick="transpor(1)">+ Tom</button>
                    </div>

                    <button class="btn-tool-full" id="btn-tab" onclick="toggleTablatura()" style="margin-bottom: 15px;">Esconder Tablatura</button>

                    <button class="btn-tool-full" id="btn-scroll" onclick="toggleScroll()" style="margin-bottom: 15px;">Ativar Rolagem</button>              
                    
                    <div style="margin-bottom: 20px;">
                        <label style="font-size: 12px; color: var(--text-gray); display:block; margin-bottom:5px;">Velocidade da Rolagem:</label>
                        <input type="range" id="scroll-speed" min="1" max="10" value="5" style="width: 100%;">
                    </div>
                    
                    <button class="btn-tool-full" onclick="window.location.href='hub.php'" style="background: transparent; border: 1px solid var(--text-gray); text-align: center;">Voltar ao Hub</button>
                </div>
            </aside>
        </div>
    </main>

    <footer class="footer">
        <p>&copy; 2026 CifraDog - Todos os direitos reservados.</p>
    </footer>

    <script>
        const cifraElement = document.getElementById('cifra-texto');

        let cifraOriginalHTML = cifraElement.innerHTML;

        let cifraOriginalTexto = cifraElement.innerText;

        let tomBase = "<?php echo htmlspecialchars($musica['tom']); ?>";
        let semitons = 0;
        let tabVisible = true;

        // ==================== ROLAGEM ====================
        let scrollInterval = null;

        function toggleScroll() {
            const btn = document.getElementById('btn-scroll');
            const speedInput = document.getElementById('scroll-speed');

            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
                btn.innerText = "Ativar Rolagem";
                btn.style.borderLeft = "none";
            } else {
                let speed = parseInt(speedInput.value);
                let delay = 60 - (speed * 5);
                scrollInterval = setInterval(() => {
                    window.scrollBy(0, 1);
                }, delay);
                btn.innerText = "Parar Rolagem";
                btn.style.borderLeft = "3px solid var(--primary)";
            }
        }

        document.getElementById('scroll-speed').addEventListener('input', () => {
            if (scrollInterval) {
                toggleScroll();
                toggleScroll();
            }
        });

        // ==================== ESCONDER TABLATURA ====================
        function toggleTablatura() {
            const btn = document.getElementById('btn-tab');
            const linhas = cifraElement.querySelectorAll('.tab-linha');

            if (tabVisible) {
                linhas.forEach(l => l.style.display = 'none');
                btn.innerText = "Mostrar Tablatura";
                btn.style.borderLeft = "3px solid var(--primary)";
                tabVisible = false;
            } else {
                linhas.forEach(l => l.style.display = '');
                btn.innerText = "Esconder Tablatura";
                btn.style.borderLeft = "none";
                tabVisible = true;
            }
        }

        function marcarLinhasTab() {
            const html = cifraElement.innerHTML;
        
            const novoHTML = html.replace(/^([EADGBe]\|[^\n]*)$/gm,
                '<span class="tab-linha">$1</span>'
            );
            cifraElement.innerHTML = novoHTML;
            
            cifraOriginalHTML = cifraElement.innerHTML;
        }

        marcarLinhasTab();

        // ==================== TRANSPOSIÇÃO ====================
        const escala = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

        function detectarTipo(texto) {
            const linhasTab = texto.split('\n').filter(l => /^[EADGBe]\|/.test(l.trim()));
            return linhasTab.length >= 2 ? 'tab' : 'cifra';
        }

        function transporTablatura(linha, semitons) {
            return linha.replace(/\d+/g, (match) => {
                let casa = parseInt(match) + semitons;
                return casa < 0 ? 0 : casa;
            });
        }

        function colorirAcordes(texto) {
            const excecoes = ['O', 'I', 'U'];
            return texto.split('\n').map(linha => {
                if (/^[EADGBe]\|/.test(linha.trim())) {
                    return '<span class="tab-linha">' + linha + '</span>';
                }
                const padrao = /\b([A-G][#b]?(?:maj|min|aug|add9|maj7|dim|sus|add|m7|7M|m|M|[0-9]*)?)(?:\/([A-G][#b]?))?(?=\s|$|\n)/g;
                return linha.replace(padrao, function(match) {
                    if (!match.trim()) return match;
                    if (match.length === 1 && excecoes.includes(match)) return match;
                    return '<span class="acorde">' + match + '</span>';
                });
            }).join('\n');
        }

        function transporAcordes(texto, semitons) {
            const regex = /\b([A-G][#b]?)(m|maj|Cadd9|maj7|min|sus|dim|aug|add|[0-9]+|M7|m7|\/[A-G][#b]?)?\b/g;
            return texto.replace(regex, function(match, nota, resto) {
                let n = nota
                    .replace('Db','C#').replace('Eb','D#').replace('Gb','F#')
                    .replace('Ab','G#').replace('Bb','A#');
                let index = escala.indexOf(n);
                if (index === -1) return match;
                let novoIndex = (index + semitons + 120) % 12;
                return escala[novoIndex] + (resto || '');
            });
        }

        function atualizarTomDisplay() {
            const tomDisplay = document.getElementById('song-key');
            let idxTom = escala.indexOf(
                tomBase.replace('Db','C#').replace('Eb','D#').replace('Gb','F#')
                    .replace('Ab','G#').replace('Bb','A#')
            );
            if (idxTom !== -1) {
                tomDisplay.innerText = escala[(idxTom + semitons + 120) % 12];
            }
        }

        function reaplicarEstadoTab() {
            if (!tabVisible) {
                cifraElement.querySelectorAll('.tab-linha').forEach(l => l.style.display = 'none');
            }
        }

        function transpor(steps) {
            semitons += steps;

            let textoTransposto = cifraOriginalTexto
                .split('\n')
                .map(linha => {
                    if (/^[EADGBe]\|/.test(linha.trim())) {
                        return transporTablatura(linha, semitons);
                    } else {
                        return transporAcordes(linha, semitons);
                    }
                })
                .join('\n');

            cifraElement.innerHTML = colorirAcordes(textoTransposto);
            atualizarTomDisplay();
            reaplicarEstadoTab();
        }

        function resetarTom() {
            semitons = 0;
            cifraElement.innerHTML = cifraOriginalHTML;
            document.getElementById('song-key').innerText = tomBase;
            reaplicarEstadoTab();
        }
    </script>
</body>
</html>