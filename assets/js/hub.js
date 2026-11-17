/*
 * hub.js — Detalhes visuais do hub.php
 * Desenha os mini-diagramas de acordes que flutuam ao lado do mascote
 * (elementos com data-diagrama="Em"), usando o CifraMotor.
 */
(function () {
    'use strict';
    document.querySelectorAll('[data-diagrama]').forEach(el => {
        const acorde = el.dataset.diagrama;
        el.innerHTML = '<b>' + acorde + '</b>' + window.CifraMotor.svgViolao(acorde);
    });
})();
