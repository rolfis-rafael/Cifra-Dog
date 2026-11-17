<?php
/*
 * ============================================================
 *  funcoes.php — Funções de ajuda usadas em todo o site
 * ============================================================
 *  Partes:
 *   1. Texto e HTML ........ e(), iniciais(), corAvatar(), tempoRelativo()
 *   2. Navegação ........... redirecionar(), flash(), pegarFlashes()
 *   3. Login ............... usuarioLogado(), idUsuario(), exigirLogin()
 *   4. Segurança (CSRF) .... csrfToken(), csrfCampo(), validarCsrf()
 *   5. API (JSON) .......... responderJson(), lerEntradaJson()
 *   6. Música .............. estrelasHtml(), nomeDificuldade(),
 *                            normalizarTom(), linkYoutubeEmbed()
 * ============================================================
 */

// ================= 1. Texto e HTML =================

/* Escapa texto para colocar no HTML com segurança (evita XSS). */
function e($texto): string
{
    return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8');
}

/* Devolve as iniciais de um nome, ex.: "rolfis" -> "R", "joao silva" -> "JS". */
function iniciais(string $nome): string
{
    $partes = preg_split('/[\s._-]+/', trim($nome));
    $letras = '';
    foreach (array_slice(array_filter($partes), 0, 2) as $p) {
        $letras .= mb_strtoupper(mb_substr($p, 0, 1));
    }
    return $letras ?: '?';
}

/*
 * Escolhe uma cor de avatar fixa para cada nome (o mesmo nome sempre
 * ganha a mesma cor). Devolve um valor CSS "hsl(...)".
 */
function corAvatar(string $nome): string
{
    // AJUSTAR: saturação e luminosidade das cores de avatar.
    $matiz = crc32($nome) % 360;
    return "hsl($matiz, 45%, 38%)";
}

/* Transforma uma data em texto tipo "há 3 dias". Recebe 'Y-m-d H:i:s'. */
function tempoRelativo(?string $data): string
{
    if (!$data) {
        return '';
    }
    $seg = time() - strtotime($data);
    if ($seg < 60)       return 'agora mesmo';
    if ($seg < 3600)     return 'há ' . floor($seg / 60) . ' min';
    if ($seg < 86400)    return 'há ' . floor($seg / 3600) . ' h';
    if ($seg < 2592000)  return 'há ' . floor($seg / 86400) . ' dia(s)';
    if ($seg < 31536000) return 'há ' . floor($seg / 2592000) . ' mês(es)';
    return 'há ' . floor($seg / 31536000) . ' ano(s)';
}

// ================= 2. Navegação =================

/* Manda o navegador para outra página e para o script. */
function redirecionar(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/*
 * Guarda uma mensagem para mostrar na PRÓXIMA página (ex.: "Cifra salva!").
 * $tipo pode ser 'sucesso', 'erro' ou 'info'.
 */
function flash(string $mensagem, string $tipo = 'info'): void
{
    $_SESSION['flash'][] = ['msg' => $mensagem, 'tipo' => $tipo];
}

/* Pega e apaga as mensagens guardadas por flash(). */
function pegarFlashes(): array
{
    $lista = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $lista;
}

// ================= 3. Login =================

/* Devolve os dados do usuário logado (id, username) ou null para visitante. */
function usuarioLogado(): ?array
{
    if (empty($_SESSION['usuario_id'])) {
        return null;
    }
    return ['id' => (int)$_SESSION['usuario_id'], 'username' => $_SESSION['username'] ?? ''];
}

/* Atalho: id do usuário logado, ou 0 se for visitante. */
function idUsuario(): int
{
    return (int)($_SESSION['usuario_id'] ?? 0);
}

/* Se não estiver logado, manda para o login e depois volta para a página atual. */
function exigirLogin(): void
{
    if (!idUsuario()) {
        flash('Entre na sua conta para continuar.', 'info');
        redirecionar('login.php?voltar=' . urlencode($_SERVER['REQUEST_URI'] ?? 'hub.php'));
    }
}

// ================= 4. Segurança (CSRF) =================
// O "token CSRF" é um código secreto por sessão. Todo formulário e toda
// chamada da API manda ele junto; assim outro site não consegue fazer
// ações em nome do usuário (ex.: apagar cifras).

/* Devolve (e cria se precisar) o token CSRF da sessão. */
function csrfToken(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/* Campo escondido com o token, para colocar dentro de <form>. */
function csrfCampo(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrfToken()) . '">';
}

/* Confere o token vindo do formulário (campo "csrf") ou do cabeçalho X-CSRF-Token. */
function validarCsrf(): bool
{
    $enviado = $_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    return is_string($enviado) && hash_equals(csrfToken(), $enviado);
}

// ================= 5. API (JSON) =================

/* Responde em JSON e para o script. Usado pelos arquivos da pasta api/. */
function responderJson(array $dados, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

/* Lê o corpo JSON enviado pelo fetch() do JavaScript. Devolve um array. */
function lerEntradaJson(): array
{
    $dados = json_decode(file_get_contents('php://input') ?: '[]', true);
    return is_array($dados) ? $dados : [];
}

/*
 * Começo padrão de todo arquivo da API: exige POST, login e token válido.
 * Devolve o JSON recebido.
 */
function iniciarApi(): array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responderJson(['ok' => false, 'erro' => 'Método não permitido.'], 405);
    }
    if (!idUsuario()) {
        responderJson(['ok' => false, 'erro' => 'Entre na sua conta para fazer isso.', 'login' => true], 401);
    }
    if (!validarCsrf()) {
        responderJson(['ok' => false, 'erro' => 'Sessão expirada. Recarregue a página.'], 403);
    }
    return lerEntradaJson();
}

// ================= 6. Música =================

/* Gera 5 estrelinhas (cheias, meia ou vazias) a partir de uma média 0–5. */
function estrelasHtml($media): string
{
    $media = (float)$media;
    $html = '<span class="estrelas" title="' . number_format($media, 1, ',', '') . ' de 5">';
    for ($i = 1; $i <= 5; $i++) {
        if ($media >= $i - 0.25) {
            $html .= '<i class="fa-solid fa-star"></i>';
        } elseif ($media >= $i - 0.75) {
            $html .= '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            $html .= '<i class="fa-regular fa-star"></i>';
        }
    }
    return $html . '</span>';
}

/* Converte o código da dificuldade ('facil') no nome bonito ('Fácil'). */
function nomeDificuldade(?string $codigo): string
{
    $nomes = ['facil' => 'Fácil', 'medio' => 'Médio', 'dificil' => 'Difícil'];
    return $nomes[$codigo] ?? ucfirst((string)$codigo);
}

/*
 * Arruma o texto do tom digitado pelo usuário: " c#m " -> "C#m".
 * Devolve string vazia se não parecer um tom válido.
 */
function normalizarTom(string $tom): string
{
    $tom = trim($tom);
    if ($tom === '') {
        return '';
    }
    $tom = mb_strtoupper(mb_substr($tom, 0, 1)) . mb_substr($tom, 1);
    return preg_match('/^[A-G][#b]?(m|M|maj7|m7|7)?$/', $tom) ? $tom : '';
}

/*
 * Recebe um link do YouTube (watch, youtu.be ou shorts) e devolve o link
 * de "embed" para colocar num <iframe>. Devolve null se não reconhecer.
 */
function linkYoutubeEmbed(?string $url): ?string
{
    if (!$url) {
        return null;
    }
    if (preg_match('~(?:youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})~', $url, $m)) {
        return 'https://www.youtube-nocookie.com/embed/' . $m[1];
    }
    return null;
}

/*
 * Apaga uma música e tudo que depende dela (avaliações, favoritos,
 * comentários e itens de repertório). Usado no editor.
 */
function apagarMusica(PDO $pdo, int $musicaId): void
{
    foreach (['avaliacoes', 'favoritos', 'comentarios', 'repertorio_itens'] as $tabela) {
        $pdo->prepare("DELETE FROM $tabela WHERE musica_id = ?")->execute([$musicaId]);
    }
    $pdo->prepare('DELETE FROM musicas WHERE id = ?')->execute([$musicaId]);
}
