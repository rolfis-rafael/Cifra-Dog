<?php
/*
 * ============================================================
 *  api/repertorio.php — Tudo sobre repertórios (setlists)
 * ============================================================
 *  Recebe (JSON) um campo "acao":
 *    criar      { nome, musica_id?, semitons? } -> cria (e já adiciona a música, se vier)
 *    renomear   { repertorio_id, nome, descricao? }
 *    excluir    { repertorio_id }
 *    adicionar  { repertorio_id, musica_id, semitons? }
 *    remover    { repertorio_id, musica_id }
 *    semitons   { repertorio_id, musica_id, semitons }  -> salva o tom daquela música no show
 *    ordenar    { repertorio_id, ordem: [musica_id, musica_id, ...] }
 *
 *  Só o dono mexe no próprio repertório (conferido em donoDoRepertorio()).
 * ============================================================
 */
require_once __DIR__ . '/../includes/bootstrap.php';

$dados = iniciarApi();
$acao = $dados['acao'] ?? '';
$uid = idUsuario();
$repId = (int)($dados['repertorio_id'] ?? 0);
$musicaId = (int)($dados['musica_id'] ?? 0);

/* Para a API com erro se o repertório não for do usuário logado. */
function donoDoRepertorio(PDO $pdo, int $repId, int $uid): void
{
    $st = $pdo->prepare('SELECT COUNT(*) FROM repertorios WHERE id = ? AND usuario_id = ?');
    $st->execute([$repId, $uid]);
    if (!$st->fetchColumn()) {
        responderJson(['ok' => false, 'erro' => 'Repertório não encontrado.'], 404);
    }
}

/* Limpa o nome do repertório (1 a 80 caracteres). */
function nomeValido($nome): string
{
    $nome = trim((string)$nome);
    if ($nome === '' || mb_strlen($nome) > 80) {
        responderJson(['ok' => false, 'erro' => 'O nome precisa ter entre 1 e 80 caracteres.'], 422);
    }
    return $nome;
}

/* Semitons entre -11 e 11. */
function semitonsValidos($s): int
{
    return max(-11, min(11, (int)$s));
}

/* Coloca a música no fim do repertório (ou atualiza o tom se ela já estiver lá). */
function adicionarItem(PDO $pdo, int $repId, int $musicaId, int $semitons): void
{
    $st = $pdo->prepare('SELECT COUNT(*) FROM musicas WHERE id = ?');
    $st->execute([$musicaId]);
    if (!$st->fetchColumn()) {
        responderJson(['ok' => false, 'erro' => 'Música não encontrada.'], 404);
    }
    $st = $pdo->prepare('SELECT COALESCE(MAX(posicao), 0) + 1 FROM repertorio_itens WHERE repertorio_id = ?');
    $st->execute([$repId]);
    $pdo->prepare('INSERT INTO repertorio_itens (repertorio_id, musica_id, posicao, semitons) VALUES (?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE semitons = VALUES(semitons)')
        ->execute([$repId, $musicaId, (int)$st->fetchColumn(), $semitons]);
}

switch ($acao) {
    case 'criar':
        $nome = nomeValido($dados['nome'] ?? '');
        $pdo->prepare('INSERT INTO repertorios (usuario_id, nome, descricao) VALUES (?, ?, ?)')
            ->execute([$uid, $nome, mb_substr(trim((string)($dados['descricao'] ?? '')), 0, 255) ?: null]);
        $novoId = (int)$pdo->lastInsertId();
        if ($musicaId) {
            adicionarItem($pdo, $novoId, $musicaId, semitonsValidos($dados['semitons'] ?? 0));
        }
        responderJson(['ok' => true, 'id' => $novoId, 'nome' => $nome]);

    case 'renomear':
        donoDoRepertorio($pdo, $repId, $uid);
        $pdo->prepare('UPDATE repertorios SET nome = ?, descricao = ? WHERE id = ?')
            ->execute([nomeValido($dados['nome'] ?? ''), mb_substr(trim((string)($dados['descricao'] ?? '')), 0, 255) ?: null, $repId]);
        responderJson(['ok' => true]);

    case 'excluir':
        donoDoRepertorio($pdo, $repId, $uid);
        $pdo->prepare('DELETE FROM repertorio_itens WHERE repertorio_id = ?')->execute([$repId]);
        $pdo->prepare('DELETE FROM repertorios WHERE id = ?')->execute([$repId]);
        responderJson(['ok' => true]);

    case 'adicionar':
        donoDoRepertorio($pdo, $repId, $uid);
        adicionarItem($pdo, $repId, $musicaId, semitonsValidos($dados['semitons'] ?? 0));
        responderJson(['ok' => true]);

    case 'remover':
        donoDoRepertorio($pdo, $repId, $uid);
        $pdo->prepare('DELETE FROM repertorio_itens WHERE repertorio_id = ? AND musica_id = ?')->execute([$repId, $musicaId]);
        responderJson(['ok' => true]);

    case 'semitons':
        donoDoRepertorio($pdo, $repId, $uid);
        $pdo->prepare('UPDATE repertorio_itens SET semitons = ? WHERE repertorio_id = ? AND musica_id = ?')
            ->execute([semitonsValidos($dados['semitons'] ?? 0), $repId, $musicaId]);
        responderJson(['ok' => true]);

    case 'ordenar':
        donoDoRepertorio($pdo, $repId, $uid);
        $st = $pdo->prepare('UPDATE repertorio_itens SET posicao = ? WHERE repertorio_id = ? AND musica_id = ?');
        foreach (array_values((array)($dados['ordem'] ?? [])) as $posicao => $id) {
            $st->execute([$posicao + 1, $repId, (int)$id]);
        }
        responderJson(['ok' => true]);
}

responderJson(['ok' => false, 'erro' => 'Ação desconhecida.'], 400);
