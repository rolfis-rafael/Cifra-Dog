CREATE DATABASE IF NOT EXISTS cifradog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cifradog;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS musicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    artista VARCHAR(100) NOT NULL,
    tom VARCHAR(10) NOT NULL,
    dificuldade VARCHAR(20) NOT NULL,
    cifra TEXT NOT NULL
);

INSERT INTO musicas (titulo, artista, tom, dificuldade, cifra) VALUES 
('Negação', 'Rolfis', 'Em', 'facil', 'Intro: Em  C  G  D\n\nEm                 C\nCaminhando pelas ruas sem direção\nG                  D\nProcurando respostas para o coração\nEm                 C\nAs feridas curam mas a cicatriz fica\nG                  D\nNessa história que a vida complica'),
('Bohemian Rhapsody', 'Queen', 'G', 'dificil', 'Tom: G\n\n       F#m\nIs this the real life?\n       A\nIs this just fantasy?\n       D\nCaught in a landslide\nBm               E7\nNo escape from reality\n\n       F#m\nOpen your eyes\n       A                    D\nLook up to the skies and see');