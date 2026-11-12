-- =====================================================================
-- Elo Brasil Solidário — limpeza dos dados de teste
-- Remove: empresa "Empresa Teste Ltda" (e suas doações), a campanha
-- "TESTE - Campanha de brinquedos" e a instituição "TESTE - Casa Solidária".
-- Mantém: Instituto Esperança, Instituição Horizonte e suas campanhas.
--
-- Plano de recuperação: antes de apagar, as linhas são copiadas para
-- tabelas bkp_elo_*. A seção "DESFAZER" no fim restaura tudo.
-- Rode as partes NA ORDEM. Não rode a PARTE 2 duas vezes.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- PARTE 1 — CONFERÊNCIA (só leitura). Confira se aparece só o esperado.
-- ---------------------------------------------------------------------
SELECT 'empresa' AS tabela, id, nome AS descricao FROM empresa
 WHERE nome = 'Empresa Teste Ltda'
UNION ALL
SELECT 'instituicao', id, nome FROM instituicao
 WHERE nome LIKE 'TESTE - Casa Solid%'
UNION ALL
SELECT 'campanha', id, titulo FROM campanha
 WHERE (titulo = 'TESTE - Campanha de brinquedos' AND instituicao_id = 2)
    OR instituicao_id IN (SELECT id FROM instituicao WHERE nome LIKE 'TESTE - Casa Solid%')
UNION ALL
SELECT 'intencao_doacao', d.id, CONCAT(d.doador_nome, ' · ', d.quantidade_oferecida) FROM intencao_doacao d
 WHERE d.empresa_id IN (SELECT id FROM empresa WHERE nome = 'Empresa Teste Ltda');
-- Esperado: 1 empresa, 1 instituição, 1 campanha, 1 intenção ("Doador Empresa · 3").

-- ---------------------------------------------------------------------
-- PARTE 2 — CÓPIA DE SEGURANÇA (cria tabelas bkp_elo_*)
-- ---------------------------------------------------------------------
CREATE TABLE bkp_elo_campanha LIKE campanha;
INSERT INTO bkp_elo_campanha SELECT c.* FROM campanha c
 WHERE (c.titulo = 'TESTE - Campanha de brinquedos' AND c.instituicao_id = 2)
    OR c.instituicao_id IN (SELECT id FROM instituicao WHERE nome LIKE 'TESTE - Casa Solid%');

CREATE TABLE bkp_elo_necessidade LIKE necessidade;
INSERT INTO bkp_elo_necessidade SELECT n.* FROM necessidade n
 WHERE n.campanha_id IN (SELECT id FROM bkp_elo_campanha);

CREATE TABLE bkp_elo_empresa LIKE empresa;
INSERT INTO bkp_elo_empresa SELECT e.* FROM empresa e WHERE e.nome = 'Empresa Teste Ltda';

CREATE TABLE bkp_elo_intencao LIKE intencao_doacao;
INSERT INTO bkp_elo_intencao SELECT d.* FROM intencao_doacao d
 WHERE d.empresa_id IN (SELECT id FROM bkp_elo_empresa)
    OR d.necessidade_id IN (SELECT id FROM bkp_elo_necessidade);

CREATE TABLE bkp_elo_instituicao LIKE instituicao;
INSERT INTO bkp_elo_instituicao SELECT i.* FROM instituicao i
 WHERE i.nome LIKE 'TESTE - Casa Solid%' AND i.id NOT IN (1, 2);

CREATE TABLE bkp_elo_responsavel LIKE responsavel;
INSERT INTO bkp_elo_responsavel SELECT r.* FROM responsavel r
 WHERE r.instituicao_id IN (SELECT id FROM bkp_elo_instituicao);

-- ---------------------------------------------------------------------
-- PARTE 3 — REMOÇÃO (apaga exatamente o que foi copiado na PARTE 2)
-- ---------------------------------------------------------------------
START TRANSACTION;
DELETE FROM intencao_doacao WHERE id IN (SELECT id FROM bkp_elo_intencao);
DELETE FROM necessidade     WHERE id IN (SELECT id FROM bkp_elo_necessidade);
DELETE FROM campanha        WHERE id IN (SELECT id FROM bkp_elo_campanha);
DELETE FROM responsavel     WHERE id IN (SELECT id FROM bkp_elo_responsavel);
DELETE FROM instituicao     WHERE id IN (SELECT id FROM bkp_elo_instituicao);
DELETE FROM empresa         WHERE id IN (SELECT id FROM bkp_elo_empresa);
COMMIT;

-- Conferência final: deve voltar vazio.
SELECT 'sobrou' AS aviso, nome FROM empresa WHERE nome = 'Empresa Teste Ltda'
UNION ALL SELECT 'sobrou', nome FROM instituicao WHERE nome LIKE 'TESTE - %'
UNION ALL SELECT 'sobrou', titulo FROM campanha WHERE titulo LIKE 'TESTE - %';

-- ---------------------------------------------------------------------
-- OPCIONAL — remover também a doação de teste "Pessoa Teste" (2 casacos,
-- já confirmada, na Campanha de agasalhos). Sem ela, o progresso da
-- campanha volta a 0 de 20. Rode só se quiser zerar a campanha.
-- ---------------------------------------------------------------------
-- CREATE TABLE bkp_elo_intencao_pessoa LIKE intencao_doacao;
-- INSERT INTO bkp_elo_intencao_pessoa SELECT * FROM intencao_doacao
--  WHERE doador_nome = 'Pessoa Teste' AND doador_contato = 'teste@example.com';
-- DELETE FROM intencao_doacao WHERE id IN (SELECT id FROM bkp_elo_intencao_pessoa);

-- ---------------------------------------------------------------------
-- DESFAZER (só se precisar restaurar). Ordem respeita as chaves.
-- ---------------------------------------------------------------------
-- START TRANSACTION;
-- INSERT INTO empresa         SELECT * FROM bkp_elo_empresa;
-- INSERT INTO instituicao     SELECT * FROM bkp_elo_instituicao;
-- INSERT INTO responsavel     SELECT * FROM bkp_elo_responsavel;
-- INSERT INTO campanha        SELECT * FROM bkp_elo_campanha;
-- INSERT INTO necessidade     SELECT * FROM bkp_elo_necessidade;
-- INSERT INTO intencao_doacao SELECT * FROM bkp_elo_intencao;
-- COMMIT;

-- ---------------------------------------------------------------------
-- FINAL — depois de conferir o site, apague as cópias de segurança.
-- ---------------------------------------------------------------------
-- DROP TABLE bkp_elo_intencao, bkp_elo_necessidade, bkp_elo_campanha,
--            bkp_elo_responsavel, bkp_elo_instituicao, bkp_elo_empresa;
-- (e bkp_elo_intencao_pessoa, se tiver rodado o opcional)
