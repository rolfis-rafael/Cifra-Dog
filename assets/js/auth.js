/* auth.js — Botão "olho" que mostra/esconde a senha em login.php e cadastro.php. */
document.querySelectorAll('.olho').forEach(botao => {
    botao.addEventListener('click', () => {
        const campo = botao.previousElementSibling;
        campo.type = campo.type === 'password' ? 'text' : 'password';
        botao.querySelector('i').className = 'fa-solid ' + (campo.type === 'password' ? 'fa-eye' : 'fa-eye-slash');
    });
});
