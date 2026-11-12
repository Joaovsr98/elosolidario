-- Limpeza dos dados de teste — PASSO 2: EXECUTAR (cópia de segurança + remoção).
-- Copia as linhas para tabelas bkp_elo_* e apaga exatamente essas linhas.
-- Rode UMA vez só (se rodar de novo, para no primeiro CREATE TABLE, sem apagar nada).
SET NAMES utf8mb4;

CREATE TABLE bkp_elo_campanha AS SELECT c.* FROM campanha c
 WHERE (c.titulo = 'TESTE - Campanha de brinquedos' AND c.instituicao_id = 2)
    OR c.instituicao_id IN (SELECT id FROM instituicao WHERE nome LIKE 'TESTE - Casa Solid%' AND id NOT IN (1, 2));

CREATE TABLE bkp_elo_necessidade AS SELECT n.* FROM necessidade n
 WHERE n.campanha_id IN (SELECT id FROM bkp_elo_campanha);

CREATE TABLE bkp_elo_empresa AS SELECT e.* FROM empresa e WHERE e.nome = 'Empresa Teste Ltda';

CREATE TABLE bkp_elo_intencao AS SELECT d.* FROM intencao_doacao d
 WHERE d.empresa_id IN (SELECT id FROM bkp_elo_empresa)
    OR d.necessidade_id IN (SELECT id FROM bkp_elo_necessidade);

CREATE TABLE bkp_elo_instituicao AS SELECT i.* FROM instituicao i
 WHERE i.nome LIKE 'TESTE - Casa Solid%' AND i.id NOT IN (1, 2);

CREATE TABLE bkp_elo_responsavel AS SELECT r.* FROM responsavel r
 WHERE r.instituicao_id IN (SELECT id FROM bkp_elo_instituicao);

START TRANSACTION;
DELETE FROM intencao_doacao WHERE id IN (SELECT id FROM bkp_elo_intencao);
DELETE FROM necessidade     WHERE id IN (SELECT id FROM bkp_elo_necessidade);
DELETE FROM campanha        WHERE id IN (SELECT id FROM bkp_elo_campanha);
DELETE FROM responsavel     WHERE id IN (SELECT id FROM bkp_elo_responsavel);
DELETE FROM instituicao     WHERE id IN (SELECT id FROM bkp_elo_instituicao);
DELETE FROM empresa         WHERE id IN (SELECT id FROM bkp_elo_empresa);
COMMIT;

-- Quantas linhas foram guardadas (e removidas) por tabela:
SELECT 'empresa' AS tabela, COUNT(*) AS removidas FROM bkp_elo_empresa
UNION ALL SELECT 'instituicao', COUNT(*) FROM bkp_elo_instituicao
UNION ALL SELECT 'responsavel', COUNT(*) FROM bkp_elo_responsavel
UNION ALL SELECT 'campanha', COUNT(*) FROM bkp_elo_campanha
UNION ALL SELECT 'necessidade', COUNT(*) FROM bkp_elo_necessidade
UNION ALL SELECT 'intencao_doacao', COUNT(*) FROM bkp_elo_intencao;

-- Deve voltar vazio:
SELECT 'sobrou' AS aviso, nome AS registro FROM empresa WHERE nome = 'Empresa Teste Ltda'
UNION ALL SELECT 'sobrou', nome FROM instituicao WHERE nome LIKE 'TESTE - %'
UNION ALL SELECT 'sobrou', titulo FROM campanha WHERE titulo LIKE 'TESTE - %';
