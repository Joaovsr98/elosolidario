-- Credenciais — PASSO B: troca a senha do root.
-- Rode SOMENTE depois que o site estiver funcionando com o usuário elo_app.
-- A senha vem da variável NOVA_SENHA_ROOT do terminal (nunca escreva a senha aqui).
ALTER USER 'root'@'%' IDENTIFIED BY '{{NOVA_SENHA_ROOT}}';
ALTER USER IF EXISTS 'root'@'localhost' IDENTIFIED BY '{{NOVA_SENHA_ROOT}}';
