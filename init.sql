SET NAMES utf8mb4;

ALTER DATABASE marmitadb
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Aberto'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO users (username, password)
VALUES (
  'admin',
  '$2b$10$3EuW4gDysEXa3uXGRJYKGuzi9bZmfMS32QeJuv1aQiF8Ra7TVdIVK'
);

INSERT INTO items (name, category)
VALUES
  ('Arroz Branco', 'Base'),
  ('Feijão Preto', 'Grão');