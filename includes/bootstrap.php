<?php
/*
 * ============================================================
 *  bootstrap.php — "Ligação" do site
 * ============================================================
 *  Toda página começa com:  require_once __DIR__ . '/includes/bootstrap.php';
 *
 *  O que ele faz, em ordem:
 *   1. Carrega config.php, funcoes.php e banco.php
 *   2. Configura a exibição de erros
 *   3. Inicia a sessão (login) de forma segura
 *   4. Conecta no banco ($pdo) e roda as migrações automáticas
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/funcoes.php';
require_once __DIR__ . '/banco.php';

error_reporting(E_ALL);
ini_set('display_errors', MODO_DESENVOLVIMENTO ? '1' : '0');
date_default_timezone_set('America/Sao_Paulo');

if (session_status() === PHP_SESSION_NONE) {
    // Cookie de sessão inacessível pelo JavaScript e só enviado pelo próprio site.
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

$pdo = conectarBanco();
rodarMigracoes($pdo);
