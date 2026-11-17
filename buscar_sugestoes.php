<?php
/* buscar_sugestoes.php (antigo) — substituído por api/sugestoes.php. */
header("Location: api/sugestoes.php?q=" . urlencode($_GET["q"] ?? ""));
exit;
