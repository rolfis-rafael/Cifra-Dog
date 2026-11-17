<?php
/* logout.php — Encerra a sessão e volta para o hub. */
require_once __DIR__ . '/includes/bootstrap.php';
$_SESSION = [];
session_destroy();
session_start();
flash('Você saiu da conta. Até a próxima! 🐾', 'info');
redirecionar('hub.php');
