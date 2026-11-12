-- OPCIONAL — remove também a doação de teste "Pessoa Teste" (2 casacos, já confirmada).
-- Sem ela, a Campanha de agasalhos volta a 0 de 20. Guarda cópia em bkp_elo_intencao_pessoa.
SET NAMES utf8mb4;
CREATE TABLE bkp_elo_intencao_pessoa AS SELECT * FROM intencao_doacao
 WHERE doador_nome = 'Pessoa Teste' AND doador_contato = 'teste@example.com';
DELETE FROM intencao_doacao WHERE id IN (SELECT id FROM bkp_elo_intencao_pessoa);
SELECT COUNT(*) AS removidas FROM bkp_elo_intencao_pessoa;
-- Para desfazer: INSERT INTO intencao_doacao SELECT * FROM bkp_elo_intencao_pessoa;
