-- Credenciais — PASSO A: cria o usuário da aplicação com privilégios mínimos.
-- A senha vem da variável SENHA_DO_APP do terminal (nunca escreva a senha aqui).
-- {{BANCO_ATUAL}} é preenchido automaticamente com o banco do ELO_DB_URL.
CREATE USER 'elo_app'@'%' IDENTIFIED BY '{{SENHA_DO_APP}}';
GRANT SELECT, INSERT, UPDATE, DELETE ON `{{BANCO_ATUAL}}`.* TO 'elo_app'@'%';
SHOW GRANTS FOR 'elo_app'@'%';
