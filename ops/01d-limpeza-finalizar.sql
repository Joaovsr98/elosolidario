-- Limpeza dos dados de teste — FINALIZAR: apaga as cópias de segurança.
-- Rode só depois de conferir o site. Depois disso não dá mais para desfazer.
DROP TABLE IF EXISTS bkp_elo_intencao, bkp_elo_necessidade, bkp_elo_campanha,
                     bkp_elo_responsavel, bkp_elo_instituicao, bkp_elo_empresa,
                     bkp_elo_intencao_pessoa;
