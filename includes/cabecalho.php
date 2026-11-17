<?php
/*
 * ============================================================
 *  cabecalho.php — Topo de todas as páginas (HTML <head> + barra de navegação)
 * ============================================================
 *  Antes de incluir, a página pode definir:
 *    $tituloPagina  — texto da aba do navegador
 *    $paginaAtiva   — 'hub', 'repertorios', 'nova' ou 'perfil' (destaca o menu)
 *    $classeBody    — classe extra no <body> (ex.: 'pagina-cifra')
 *
 *  Partes:
 *   1. <head> com fontes, ícones e o CSS único (assets/css/app.css)
 *   2. Barra de navegação com busca inteligente e menu do usuário
 *   3. Mensagens "flash" (avisos de sucesso/erro)
 *
 *  ONDE: os links do menu ficam na seção 2.
 * ============================================================
 */

$tituloPagina = $tituloPagina ?? APP_NOME;
$paginaAtiva  = $paginaAtiva ?? '';
$classeBody   = $classeBody ?? '';
$usuario      = usuarioLogado();

// Muda o ?v= toda vez que o arquivo mudar, para o navegador não usar CSS/JS velho do cache.
$versaoCss = @filemtime(__DIR__ . '/../assets/css/app.css') ?: 1;
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?= e(csrfToken()) ?>">
    <meta name="theme-color" content="#121110">
    <title><?= e($tituloPagina) ?></title>
    <link rel="icon" href="img/dog.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/app.css?v=<?= $versaoCss ?>">
</head>
<body class="<?= e($classeBody) ?>">

<!-- ========== 2. Barra de navegação ========== -->
<header class="navbar">
    <div class="nav-container">
        <a href="hub.php" class="nav-logo-link" aria-label="Início">
            <img src="img/cifardoglogotexto.png" alt="CifraDog" class="nav-logo">
        </a>

        <!-- Busca: o app.js mostra sugestões de músicas e artistas enquanto digita -->
        <form action="hub.php" method="GET" class="busca" role="search" autocomplete="off">
            <i class="fa-solid fa-magnifying-glass busca-icone"></i>
            <input type="search" name="busca" id="campo-busca" placeholder="Buscar música ou artista…  ( / )"
                   value="<?= e($_GET['busca'] ?? '') ?>" aria-label="Buscar">
            <div class="busca-sugestoes" id="busca-sugestoes" hidden></div>
        </form>

        <button class="nav-hamburguer" id="nav-hamburguer" aria-label="Abrir menu"><i class="fa-solid fa-bars"></i></button>

        <nav class="nav-links" id="nav-links">
            <a href="hub.php" class="<?= $paginaAtiva === 'hub' ? 'ativo' : '' ?>"><i class="fa-solid fa-compass"></i> Explorar</a>
            <a href="repertorio.php" class="<?= $paginaAtiva === 'repertorios' ? 'ativo' : '' ?>"><i class="fa-solid fa-list-ol"></i> Repertórios</a>
            <a href="editor.php" class="btn btn-ouro btn-pequeno <?= $paginaAtiva === 'nova' ? 'ativo' : '' ?>"><i class="fa-solid fa-plus"></i> Nova cifra</a>

            <?php if ($usuario): ?>
                <div class="menu-usuario">
                    <button class="avatar-botao" id="avatar-botao" aria-haspopup="true" aria-expanded="false">
                        <span class="avatar" style="background: <?= e(corAvatar($usuario['username'])) ?>"><?= e(iniciais($usuario['username'])) ?></span>
                        <span class="avatar-nome"><?= e($usuario['username']) ?></span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    <div class="menu-suspenso" id="menu-suspenso" hidden>
                        <a href="perfil.php"><i class="fa-solid fa-user"></i> Meu perfil</a>
                        <a href="perfil.php?aba=favoritas"><i class="fa-solid fa-heart"></i> Favoritas</a>
                        <a href="repertorio.php"><i class="fa-solid fa-list-ol"></i> Meus repertórios</a>
                        <hr>
                        <a href="logout.php" class="perigo"><i class="fa-solid fa-right-from-bracket"></i> Sair</a>
                    </div>
                </div>
            <?php else: ?>
                <a href="login.php" class="<?= $paginaAtiva === 'login' ? 'ativo' : '' ?>">Entrar</a>
                <a href="cadastro.php" class="btn btn-contorno btn-pequeno">Criar conta</a>
            <?php endif; ?>
        </nav>
    </div>
</header>

<!-- ========== 3. Mensagens flash ========== -->
<div class="toasts" id="toasts">
    <?php foreach (pegarFlashes() as $f): ?>
        <div class="toast toast-<?= e($f['tipo']) ?>"><?= e($f['msg']) ?></div>
    <?php endforeach; ?>
</div>
