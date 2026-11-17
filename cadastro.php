<?php
/*
 * cadastro.php — Criar conta (formulário + processamento no mesmo arquivo)
 * Regras: usuário 3–30 caracteres (letras, números, _ . -), e-mail válido, senha 6+.
 */
require_once __DIR__ . '/includes/bootstrap.php';
if (idUsuario()) redirecionar('hub.php');

$erros = [];
$v = ['username' => '', 'email' => '', 'instrumento' => ''];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $v['username'] = trim($_POST['username'] ?? '');
    $v['email'] = trim($_POST['email'] ?? '');
    $v['instrumento'] = trim($_POST['instrumento'] ?? '');
    $senha = $_POST['password'] ?? '';

    if (!validarCsrf()) $erros[] = 'Sessão expirada. Tente de novo.';
    if (!preg_match('/^[\p{L}\p{N}_.\-]{3,30}$/u', $v['username'])) $erros[] = 'Usuário: 3 a 30 caracteres (letras, números, _ . -).';
    if (!filter_var($v['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($v['email']) > 100) $erros[] = 'E-mail inválido.';
    if (mb_strlen($senha) < 6) $erros[] = 'A senha precisa ter pelo menos 6 caracteres.';

    if (!$erros) {
        try {
            $pdo->prepare('INSERT INTO usuarios (username, email, senha, instrumento) VALUES (?, ?, ?, ?)')
                ->execute([$v['username'], $v['email'], password_hash($senha, PASSWORD_DEFAULT), mb_substr($v['instrumento'], 0, 40) ?: null]);
            // Já entra logado depois de criar a conta.
            session_regenerate_id(true);
            $_SESSION['usuario_id'] = (int)$pdo->lastInsertId();
            $_SESSION['username'] = $v['username'];
            flash('Conta criada! Bem-vindo ao CifraDog 🎸', 'sucesso');
            redirecionar('hub.php');
        } catch (PDOException $e) {
            $erros[] = ($e->errorInfo[1] ?? 0) == 1062 ? 'Esse usuário ou e-mail já está cadastrado.' : 'Não foi possível criar a conta.';
        }
    }
}

$tituloPagina = 'Criar conta - CifraDog';
$classeBody = 'pagina-auth';
require __DIR__ . '/includes/cabecalho.php';
?>
<main class="auth">
    <div class="auth-arte">
        <img src="img/cifardoglogotexto.png" alt="CifraDog" class="auth-logo">
        <img src="img/dog.png" alt="" class="auth-dog">
    </div>
    <form class="auth-cartao" method="POST">
        <h1>Criar conta</h1>
        <?= csrfCampo() ?>
        <?php foreach ($erros as $erro): ?><div class="alerta alerta-erro"><?= e($erro) ?></div><?php endforeach; ?>
        <label class="campo"><span>Nome de usuário</span>
            <input type="text" name="username" value="<?= e($v['username']) ?>" required autofocus autocomplete="username"></label>
        <label class="campo"><span>E-mail</span>
            <input type="email" name="email" value="<?= e($v['email']) ?>" required autocomplete="email"></label>
        <label class="campo"><span>Senha</span>
            <div class="campo-senha"><input type="password" name="password" required minlength="6" autocomplete="new-password">
            <button type="button" class="olho" aria-label="Mostrar senha"><i class="fa-solid fa-eye"></i></button></div></label>
        <label class="campo"><span>Instrumento principal (opcional)</span>
            <select name="instrumento">
                <option value="">—</option>
                <?php foreach (['Violão', 'Guitarra', 'Baixo', 'Teclado', 'Ukulele', 'Bateria', 'Voz'] as $i): ?>
                    <option <?= $v['instrumento'] === $i ? 'selected' : '' ?>><?= $i ?></option>
                <?php endforeach; ?>
            </select></label>
        <button class="btn btn-ouro btn-largo">Criar conta</button>
        <p class="auth-rodape">Já tem conta? <a href="login.php">Entrar</a></p>
    </form>
</main>
<?php
$scriptsExtras = ['assets/js/auth.js'];
require __DIR__ . '/includes/rodape.php';
