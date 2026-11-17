<?php
/*
 * ============================================================
 *  banco.php — Conexão com o MySQL e atualização automática
 * ============================================================
 *  Para que serve: conecta no banco e, se precisar, cria ou
 *  atualiza as tabelas sozinho. Assim você não precisa importar
 *  nenhum .sql na mão: basta abrir o site.
 *
 *  Partes:
 *   1. conectarBanco()       — abre a conexão (cria o banco se não existir)
 *   2. rodarMigracoes()      — confere a versão do banco e atualiza
 *   3. migracao1()           — todas as tabelas e colunas do CifraDog
 *   4. garantirColuna()      — adiciona uma coluna só se ela faltar
 *   5. popularExemplos()     — coloca cifras de exemplo num banco vazio
 *   6. paginaErroBanco()     — tela amigável quando o MySQL está desligado
 *
 *  ONDE: para criar uma tabela ou coluna nova no futuro, crie uma
 *  função migracao2(), chame ela em rodarMigracoes() e aumente
 *  VERSAO_BANCO para 2.
 * ============================================================
 */

// Versão atual da estrutura do banco. Aumente quando criar uma migração nova.
const VERSAO_BANCO = 1;

/*
 * Abre a conexão PDO com o banco do CifraDog.
 * Se o banco "cifradog" ainda não existir, ele é criado na hora.
 * Devolve o objeto PDO pronto para uso.
 */
function conectarBanco(): PDO
{
    $opcoes = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NOME . ';charset=utf8mb4', DB_USUARIO, DB_SENHA, $opcoes);
    } catch (PDOException $e) {
        // Erro 1049 = banco não existe. Nesse caso criamos ele e tentamos de novo.
        if ((int)($e->errorInfo[1] ?? 0) !== 1049 && strpos($e->getMessage(), '1049') === false) {
            paginaErroBanco($e);
        }
    }

    try {
        $semBanco = new PDO('mysql:host=' . DB_HOST . ';charset=utf8mb4', DB_USUARIO, DB_SENHA, $opcoes);
        $semBanco->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NOME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        return new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NOME . ';charset=utf8mb4', DB_USUARIO, DB_SENHA, $opcoes);
    } catch (PDOException $e) {
        paginaErroBanco($e);
    }
}

/*
 * Confere em que versão o banco está e roda as migrações que faltam.
 * É rápido: na maioria das vezes faz só um SELECT e sai.
 */
function rodarMigracoes(PDO $pdo): void
{
    try {
        $versao = (int)$pdo->query("SELECT valor FROM app_meta WHERE chave = 'versao_banco'")->fetchColumn();
    } catch (PDOException $e) {
        // Tabela app_meta ainda não existe: banco antigo ou novo em folha.
        $pdo->exec("CREATE TABLE IF NOT EXISTS app_meta (
                        chave VARCHAR(50) PRIMARY KEY,
                        valor VARCHAR(255) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $versao = 0;
    }

    if ($versao >= VERSAO_BANCO) {
        return;
    }

    if ($versao < 1) {
        migracao1($pdo);
    }
    // Futuro: if ($versao < 2) { migracao2($pdo); }

    $pdo->prepare("REPLACE INTO app_meta (chave, valor) VALUES ('versao_banco', ?)")->execute([(string)VERSAO_BANCO]);
}

/*
 * Migração 1: cria todas as tabelas do CifraDog novo.
 * Funciona tanto num banco vazio quanto no banco antigo do projeto
 * (só adiciona o que estiver faltando, nunca apaga dados).
 */
function migracao1(PDO $pdo): void
{
    $motor = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL
    ) $motor");

    $pdo->exec("CREATE TABLE IF NOT EXISTS musicas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(100) NOT NULL,
        artista VARCHAR(100) NOT NULL,
        tom VARCHAR(10) NOT NULL,
        dificuldade VARCHAR(20) NOT NULL,
        cifra MEDIUMTEXT NOT NULL
    ) $motor");

    // Colunas novas (ou que o projeto antigo já usava mas não estavam no banco.sql).
    garantirColuna($pdo, 'usuarios', 'bio', 'VARCHAR(300) NULL');
    garantirColuna($pdo, 'usuarios', 'instrumento', 'VARCHAR(40) NULL');
    garantirColuna($pdo, 'usuarios', 'criado_em', 'DATETIME NULL DEFAULT CURRENT_TIMESTAMP');

    garantirColuna($pdo, 'musicas', 'usuario_id', 'INT NULL');
    garantirColuna($pdo, 'musicas', 'bpm', 'INT NOT NULL DEFAULT 0');
    garantirColuna($pdo, 'musicas', 'media_avaliacao', 'DECIMAL(3,2) NOT NULL DEFAULT 0');
    garantirColuna($pdo, 'musicas', 'total_votos', 'INT NOT NULL DEFAULT 0');
    garantirColuna($pdo, 'musicas', 'genero', 'VARCHAR(40) NULL');
    garantirColuna($pdo, 'musicas', 'capo', 'TINYINT NOT NULL DEFAULT 0');
    garantirColuna($pdo, 'musicas', 'afinacao', "VARCHAR(40) NOT NULL DEFAULT 'Padrão'");
    garantirColuna($pdo, 'musicas', 'video_url', 'VARCHAR(255) NULL');
    garantirColuna($pdo, 'musicas', 'visualizacoes', 'INT NOT NULL DEFAULT 0');
    garantirColuna($pdo, 'musicas', 'criado_em', 'DATETIME NULL DEFAULT CURRENT_TIMESTAMP');
    garantirColuna($pdo, 'musicas', 'atualizado_em', 'DATETIME NULL');

    // Cifras grandes (com tablatura) passam de 64 KB fácil; MEDIUMTEXT aguenta 16 MB.
    $pdo->exec("ALTER TABLE musicas MODIFY cifra MEDIUMTEXT NOT NULL");

    // O formulário antigo salvava "medio" e o filtro procurava "media". Padronizamos em "medio".
    $pdo->exec("UPDATE musicas SET dificuldade = 'medio' WHERE dificuldade IN ('media', 'média', 'médio')");
    $pdo->exec("UPDATE musicas SET dificuldade = 'dificil' WHERE dificuldade = 'difícil'");
    $pdo->exec("UPDATE musicas SET dificuldade = 'facil' WHERE dificuldade = 'fácil'");

    $pdo->exec("CREATE TABLE IF NOT EXISTS avaliacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        musica_id INT NOT NULL,
        usuario_id INT NOT NULL,
        nota TINYINT NOT NULL,
        UNIQUE KEY uk_avaliacao (musica_id, usuario_id)
    ) $motor");

    $pdo->exec("CREATE TABLE IF NOT EXISTS favoritos (
        usuario_id INT NOT NULL,
        musica_id INT NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, musica_id),
        KEY idx_fav_musica (musica_id)
    ) $motor");

    $pdo->exec("CREATE TABLE IF NOT EXISTS comentarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        musica_id INT NOT NULL,
        usuario_id INT NOT NULL,
        texto TEXT NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_com_musica (musica_id)
    ) $motor");

    $pdo->exec("CREATE TABLE IF NOT EXISTS repertorios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome VARCHAR(80) NOT NULL,
        descricao VARCHAR(255) NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_rep_usuario (usuario_id)
    ) $motor");

    // "semitons" guarda o tom escolhido para aquela música dentro do repertório.
    $pdo->exec("CREATE TABLE IF NOT EXISTS repertorio_itens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        repertorio_id INT NOT NULL,
        musica_id INT NOT NULL,
        posicao INT NOT NULL DEFAULT 0,
        semitons TINYINT NOT NULL DEFAULT 0,
        UNIQUE KEY uk_rep_musica (repertorio_id, musica_id)
    ) $motor");

    popularExemplos($pdo);
}

/*
 * Adiciona a coluna $coluna na $tabela, mas só se ela ainda não existir.
 * Usa o information_schema para funcionar em qualquer versão do MySQL/MariaDB.
 */
function garantirColuna(PDO $pdo, string $tabela, string $coluna, string $definicao): void
{
    $st = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS
                         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $st->execute([$tabela, $coluna]);
    if ((int)$st->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `$tabela` ADD `$coluna` $definicao");
    }
}

/*
 * Se o banco não tiver nenhuma música, coloca duas cifras de exemplo
 * para o site não abrir vazio. Elas mostram seções, tablatura e acordes.
 */
function popularExemplos(PDO $pdo): void
{
    if ((int)$pdo->query('SELECT COUNT(*) FROM musicas')->fetchColumn() > 0) {
        return;
    }

    $negacao = "[Intro] Em  C  G  D\n\n[Primeira Parte]\nEm                 C\nCaminhando pelas ruas sem direção\nG                  D\nProcurando respostas para o coração\nEm                 C\nAs feridas curam mas a cicatriz fica\nG                  D\nNessa história que a vida complica";

    $exemplo = "[Intro]\nE|-------0-------0-----|\nB|-----1-------1-------|\nG|---0-------2---------|\nD|-2-------2-----------|\nA|-----------0---------|\nE|---------------------|\n\n[Primeira Parte]\nAm              F\n  Late a guitarra no fim da rua\nC                  G\n  O cão acorda e canta pra lua\nAm              F\n  Cada acorde é uma pegada\nC          G         E7\n  Deixando trilha na madrugada\n\n[Refrão]\nF        G         C     Am\n  Uivo, uivo, a noite inteira\nF        G          E7\n  Até o sol subir a ladeira\n\n[Final] Am  F  C  G  Am";

    $st = $pdo->prepare('INSERT INTO musicas (titulo, artista, tom, dificuldade, cifra, bpm, genero) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $st->execute(['Negação', 'Rolfis', 'Em', 'facil', $negacao, 92, 'Rock']);
    $st->execute(['Uivo na Madrugada', 'Equipe CifraDog', 'Am', 'medio', $exemplo, 110, 'Rock']);
}

/*
 * Mostra uma página explicando o erro de conexão e para o script.
 * Recebe a exceção do PDO.
 */
function paginaErroBanco(PDOException $e): void
{
    http_response_code(500);
    $detalhe = MODO_DESENVOLVIMENTO ? htmlspecialchars($e->getMessage()) : '';
    echo "<!DOCTYPE html><html lang='pt-br'><head><meta charset='UTF-8'><title>CifraDog - Banco offline</title></head>
          <body style='background:#121110;color:#eee;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0'>
          <div style='max-width:520px;padding:32px;background:#1c1b19;border-radius:16px;border:1px solid #333'>
          <h2 style='color:#D9AE30;margin-top:0'>Não consegui falar com o banco de dados</h2>
          <p>Abra o painel do XAMPP e confira se o <b>MySQL</b> está ligado (botão Start).</p>
          <p>Se o seu MySQL tem senha, coloque ela em <code>includes/config.php</code>.</p>
          <p style='color:#888;font-size:13px'>$detalhe</p></div></body></html>";
    exit;
}
