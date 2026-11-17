-- banco.sql — OPCIONAL. O CifraDog cria e atualiza o banco sozinho (veja includes/banco.php).
-- Use este arquivo só se quiser importar a estrutura manualmente no phpMyAdmin.

/*M!999999\- enable the sandbox mode */ 
CREATE DATABASE /*!32312 IF NOT EXISTS*/ `cifradog` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `cifradog`;
DROP TABLE IF EXISTS `app_meta`;
CREATE TABLE `app_meta` (
  `chave` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  PRIMARY KEY (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
DROP TABLE IF EXISTS `avaliacoes`;
CREATE TABLE `avaliacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `musica_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nota` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_avaliacao` (`musica_id`,`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `comentarios`;
CREATE TABLE `comentarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `musica_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `texto` text NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_com_musica` (`musica_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `favoritos`;
CREATE TABLE `favoritos` (
  `usuario_id` int(11) NOT NULL,
  `musica_id` int(11) NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`usuario_id`,`musica_id`),
  KEY `idx_fav_musica` (`musica_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `musicas`;
CREATE TABLE `musicas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(100) NOT NULL,
  `artista` varchar(100) NOT NULL,
  `tom` varchar(10) NOT NULL,
  `dificuldade` varchar(20) NOT NULL,
  `cifra` mediumtext NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `bpm` int(11) NOT NULL DEFAULT 0,
  `media_avaliacao` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_votos` int(11) NOT NULL DEFAULT 0,
  `genero` varchar(40) DEFAULT NULL,
  `capo` tinyint(4) NOT NULL DEFAULT 0,
  `afinacao` varchar(40) NOT NULL DEFAULT 'Padrão',
  `video_url` varchar(255) DEFAULT NULL,
  `visualizacoes` int(11) NOT NULL DEFAULT 0,
  `criado_em` datetime DEFAULT current_timestamp(),
  `atualizado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `repertorio_itens`;
CREATE TABLE `repertorio_itens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repertorio_id` int(11) NOT NULL,
  `musica_id` int(11) NOT NULL,
  `posicao` int(11) NOT NULL DEFAULT 0,
  `semitons` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rep_musica` (`repertorio_id`,`musica_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `repertorios`;
CREATE TABLE `repertorios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nome` varchar(80) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rep_usuario` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `bio` varchar(300) DEFAULT NULL,
  `instrumento` varchar(40) DEFAULT NULL,
  `criado_em` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
