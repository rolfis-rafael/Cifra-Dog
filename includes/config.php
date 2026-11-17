<?php
/*
 * ============================================================
 *  config.php — Configurações gerais do CifraDog
 * ============================================================
 *  Para que serve: guarda os dados de acesso ao banco e as
 *  opções gerais do site, num lugar só.
 *
 *  Partes:
 *   1. Banco de dados (host, nome, usuário, senha)
 *   2. Opções do site (nome, limites, etc.)
 *
 *  ONDE: se o MySQL do XAMPP tiver senha, troque DB_SENHA aqui.
 * ============================================================
 */

// ---------- 1. Banco de dados ----------
// AJUSTAR: dados do MySQL/MariaDB do XAMPP (padrão: root sem senha).
define('DB_HOST', 'localhost');
define('DB_NOME', 'cifradog');
define('DB_USUARIO', 'root');
define('DB_SENHA', '');

// ---------- 2. Opções do site ----------
define('APP_NOME', 'CifraDog');

// AJUSTAR: quantas músicas aparecem por aba no Hub.
define('ITENS_POR_PAGINA', 20);

// AJUSTAR: tamanho máximo (em caracteres) de uma cifra enviada.
define('CIFRA_MAX_CARACTERES', 60000);

// AJUSTAR: tamanho máximo de um comentário.
define('COMENTARIO_MAX_CARACTERES', 800);

// Mostrar erros do PHP na tela? Deixe true enquanto estiver desenvolvendo.
// AJUSTAR: mude para false quando o site estiver "pronto".
define('MODO_DESENVOLVIMENTO', true);
