<?php
/* avaliar.php (antigo) — a avaliação agora é feita por api/avaliar.php (sem recarregar a página). */
header("Location: cifra.php?id=" . (int)($_GET["id"] ?? 0));
exit;
