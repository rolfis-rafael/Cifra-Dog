<?php
/*
 * conexao.php (compatibilidade) — arquivo antigo do projeto.
 * Agora a conexão fica em includes/bootstrap.php. Este arquivo só repassa,
 * assim qualquer script seu que ainda use `require 'conexao.php'` continua tendo $pdo.
 */
require_once __DIR__ . '/includes/bootstrap.php';
