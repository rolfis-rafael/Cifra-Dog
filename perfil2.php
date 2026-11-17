<?php
/* perfil2.php (antigo) — perfis públicos agora são perfil.php?id=N. */
header("Location: perfil.php?id=" . (int)($_GET["id"] ?? 0));
exit;
