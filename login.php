<?php
/*
 * login.php — Tela de entrar (formulário + processamento no mesmo arquivo)
 * Aceita ?voltar=url para devolver o usuário à página de onde veio.
 */
require_once __DIR__ . '/includes/bootstrap.php';

/* Só aceita voltar para páginas do próprio site (evita "open redirect"). */
function destinoSeguro(string $url): string
{
    return preg_match('~^[a-zA-Z0-9_\-]+\.php(\?[^\s]*)?$~', ltrim($url, '/')) ? ltrim($url, '/') : 'hub.php';
}

$voltar = destinoSeguro($_GET['voltar'] ?? $_POST['voltar'] ?? 'hub.php');
if (idUsuario()) redirecionar($voltar);

$erro = '';
$usuarioDigitado = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuarioDigitado = trim($_POST['username'] ?? '');
    if (!validarCsrf()) {
        $erro = 'Sessão expirada. Tente de novo.';
    } else {
        $st = $pdo->prepare('SELECT * FROM usuarios WHERE username = ? OR email = ?');
        $st->execute([$usuarioDigitado, $usuarioDigitado]);
        $u = $st->fetch();
        if ($u && password_verify($_POST['password'] ?? '', $u['senha'])) {
            session_regenerate_id(true); // novo id de sessão após login (segurança)
            $_SESSION['usuario_id'] = (int)$u['id'];
            $_SESSION['username'] = $u['username'];
            flash('Bem-vindo de volta, ' . $u['username'] . '!', 'sucesso');
            redirecionar($voltar);
        }
        $erro = 'Usuário ou senha incorretos.';
    }
}

$tituloPagina = 'Entrar - CifraDog';
$paginaAtiva = 'login';
$classeBody = 'pagina-auth';
require __DIR__ . '/includes/cabecalho.php';
?>
<main class="auth">
    <div class="auth-arte">
        <img src="img/cifardoglogotexto.png" alt="CifraDog" class="auth-logo">
        <img src="img/dog.png" alt="" class="auth-dog">
    </div>
    <form class="auth-cartao" method="POST">
        <h1>Entrar</h1>
        <?= csrfCampo() ?>
        <input type="hidden" name="voltar" value="<?= e($voltar) ?>">
        <?php if ($erro): ?><div class="alerta alerta-erro"><?= e($erro) ?></div><?php endif; ?>
        <label class="campo"><span>Usuário ou e-mail</span>
            <input type="text" name="username" value="<?= e($usuarioDigitado) ?>" required autofocus autocomplete="username"></label>
        <label class="campo"><span>Senha</span>
            <div class="campo-senha"><input type="password" name="password" required autocomplete="current-password">
            <button type="button" class="olho" aria-label="Mostrar senha"><i class="fa-solid fa-eye"></i></button></div></label>
        <button class="btn btn-ouro btn-largo">Entrar</button>
        <p class="auth-rodape">Não tem conta? <a href="cadastro.php">Criar agora</a></p>
        <a class="btn btn-contorno btn-largo" href="hub.php">Continuar como visitante</a>
    </form>
</main>
<?php
$scriptsExtras = ['assets/js/auth.js'];
require __DIR__ . '/includes/rodape.php';
