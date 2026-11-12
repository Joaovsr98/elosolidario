-- =====================================================================
-- Elo Brasil Solidário — usuário da aplicação e troca da senha do root
-- Hoje a aplicação conecta como root. O ideal é usar um usuário com
-- privilégios mínimos e reservar o root para manutenção (migrações).
-- Siga o passo a passo do arquivo LEIA-ME.md: os passos do Railway
-- acontecem ENTRE as partes deste script.
--
-- NUNCA salve as senhas neste arquivo nem as cole no chat. Gere no seu
-- computador e cole direto no console do MySQL e no Railway:
--   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
-- =====================================================================

-- Confira o nome do banco (no Railway costuma ser "railway").
SELECT DATABASE() AS banco_atual;

-- ---------------------------------------------------------------------
-- PARTE 1 — criar o usuário da aplicação (rode como root)
-- Troque SENHA_DO_APP pela senha gerada e, se o banco não se chamar
-- "railway", troque também o nome na linha do GRANT.
-- ---------------------------------------------------------------------
CREATE USER 'elo_app'@'%' IDENTIFIED BY 'SENHA_DO_APP';
GRANT SELECT, INSERT, UPDATE, DELETE ON railway.* TO 'elo_app'@'%';
SHOW GRANTS FOR 'elo_app'@'%';

-- >>> Agora faça os passos 3 e 4 do LEIA-ME (aplicação passa a usar elo_app)
-- >>> e só continue depois de conferir que o site e o /health funcionam.

-- ---------------------------------------------------------------------
-- PARTE 2 — trocar a senha do root (a aplicação já não depende dele)
-- Troque NOVA_SENHA_ROOT pela segunda senha gerada.
-- ---------------------------------------------------------------------
ALTER USER 'root'@'%' IDENTIFIED BY 'NOVA_SENHA_ROOT';
ALTER USER IF EXISTS 'root'@'localhost' IDENTIFIED BY 'NOVA_SENHA_ROOT';

-- >>> Depois, faça o passo 6 do LEIA-ME (atualizar a variável no serviço MySQL).
