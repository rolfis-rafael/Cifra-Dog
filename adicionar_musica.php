<?php
    session_start();

    if (!isset($_SESSION['usuario_id'])) {
        header("Location: login.html?mensagem=voce_precisa_logar_para_adicionar");
        exit; 
    }
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style/style.css">
    <title>Adicionar Música - CifraDog</title>
    <style>

    body {
        margin: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    
    .login-container {
        max-width: 600px;
        width: 90%;
        max-height: 90vh; 
        overflow-y: auto; 
        background: #1e1e1e;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }

    .login-container::-webkit-scrollbar { width: 8px; }
    .login-container::-webkit-scrollbar-track { background: #151515; }
    .login-container::-webkit-scrollbar-thumb { background: #d9ae30; border-radius: 4px; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-wrapper i { position: absolute; left: 15px; color: #d9ae30; }
    .form-input { 
        width: 100%; padding: 14px 14px 14px 40px; 
        background: #2b2b2b; border: none; border-radius: 12px; 
        color: #fff; font-size: 16px; box-sizing: border-box;
    }

        .main-container, .form-container {
            overflow-y: auto; 
            max-height: 90vh;
        }

        .login-container { max-width: 600px; }
        textarea, select {
            width: 100%;
            background: #2b2b2b;
            border: none;
            border-radius: 12px;
            color: #fff;
            padding: 14px;
            font-size: 16px;
            outline: none;
            transition: 0.3s;
        }
        textarea { height: 200px; resize: vertical; font-family: monospace; }
        textarea:focus, select:focus { border: 2px solid #D9AE30; }
        .row { display: flex; gap: 20px; }
        .col { flex: 1; }
    </style>
</head>
<body>
    <div class="container">
        <div class="login-container" style="margin: 0 auto;">
            <form action="salvar_musica.php" method="POST">
                <h2>Adicionar Música</h2>
                
                <div class="input-group">
                    <label for="titulo">Título da Música</label>
                    <input type="text" id="titulo" name="titulo" required>
                </div>

                <div class="input-group">
                    <label for="artista">Artista</label>
                    <input type="text" id="artista" name="artista" required>
                </div>

                <div class="row">
                    <div class="input-group col">
                        <label for="tom">Tom</label>
                        <input type="text" id="tom" name="tom" required>
                    </div>
                    <div class="input-group col">
                        <label for="dificuldade">Dificuldade</label>
                        <select id="dificuldade" name="dificuldade">
                            <option value="facil">Fácil</option>
                            <option value="medio" selected>Médio</option>
                            <option value="dificil">Difícil</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="bpm">BPM (Batidas por minuto)</label>
                    <div class="input-wrapper">
                        <i class="fa-solid fa-metronome"></i>
                        <input type="number" name="bpm" id="bpm" placeholder="Ex: 120" min="20" max="300" class="form-input">
                    </div>
                </div>

                <div class="input-group">
                    <label for="cifra">Cifra / Letra</label>
                    <textarea id="cifra" name="cifra" required placeholder="Cole a cifra aqui..."></textarea>
                </div>
                
                <button type="submit">Salvar no Repertório</button>

                <div class="register">
                    <h3><a href="hub.php">Voltar ao Hub</a></h3>
                </div>
            </form>
        </div>
    </div>

    
</body>
</html>
