<?php
/*
 * ============================================================
 *  rodape.php — Rodapé de todas as páginas + scripts
 * ============================================================
 *  Antes de incluir, a página pode definir:
 *    $scriptsExtras — lista de arquivos JS extras (ex.: ['assets/js/cifra-pagina.js'])
 *    $dadosJs       — array PHP que vira a variável global window.CIFRADOG no JS
 * ============================================================
 */

$scriptsExtras = $scriptsExtras ?? [];
$dadosJs       = $dadosJs ?? [];

/* Adiciona ?v=<data do arquivo> para o navegador baixar a versão nova quando mudar. */
$comVersao = function (string $arquivo): string {
    $v = @filemtime(__DIR__ . '/../' . $arquivo) ?: 1;
    return $arquivo . '?v=' . $v;
};
?>
<footer class="rodape">
    <div class="rodape-conteudo">
        <img src="img/dog.png" alt="" class="rodape-dog">
        <div>
            <strong>CifraDog</strong> — cifras feitas pela comunidade, para a comunidade.
            <div class="rodape-dica">Dica: aperte <kbd>/</kbd> para buscar e <kbd>?</kbd> numa cifra para ver os atalhos.</div>
        </div>
        <span class="rodape-copy">&copy; <?= date('Y') ?> CifraDog</span>
    </div>
</footer>

<script>
    // Dados que o PHP passa para o JavaScript (JSON seguro contra XSS).
    window.CIFRADOG = <?= json_encode($dadosJs + ['logado' => (bool)idUsuario()], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="<?= e($comVersao('assets/js/app.js')) ?>"></script>
<?php foreach ($scriptsExtras as $s): ?>
<script src="<?= e($comVersao($s)) ?>"></script>
<?php endforeach; ?>
</body>
</html>
