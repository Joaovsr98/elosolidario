-- Limpeza dos dados de teste — DESFAZER (só se precisar restaurar o que o PASSO 2 removeu).
SET NAMES utf8mb4;
START TRANSACTION;
INSERT INTO empresa         SELECT * FROM bkp_elo_empresa;
INSERT INTO instituicao     SELECT * FROM bkp_elo_instituicao;
INSERT INTO responsavel     SELECT * FROM bkp_elo_responsavel;
INSERT INTO campanha        SELECT * FROM bkp_elo_campanha;
INSERT INTO necessidade     SELECT * FROM bkp_elo_necessidade;
INSERT INTO intencao_doacao SELECT * FROM bkp_elo_intencao;
COMMIT;
