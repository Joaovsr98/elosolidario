-- Limpeza dos dados de teste — PASSO 1: CONFERIR (somente leitura).
-- Esperado: 4 linhas — empresa "Empresa Teste Ltda", instituição "TESTE - Casa Solidária",
-- campanha "TESTE - Campanha de brinquedos" e intenção "Doador Empresa · 3".
SET NAMES utf8mb4;

SELECT 'empresa' AS tabela, id, nome AS descricao FROM empresa
 WHERE nome = 'Empresa Teste Ltda'
UNION ALL
SELECT 'instituicao', id, nome FROM instituicao
 WHERE nome LIKE 'TESTE - Casa Solid%' AND id NOT IN (1, 2)
UNION ALL
SELECT 'campanha', id, titulo FROM campanha
 WHERE (titulo = 'TESTE - Campanha de brinquedos' AND instituicao_id = 2)
    OR instituicao_id IN (SELECT id FROM instituicao WHERE nome LIKE 'TESTE - Casa Solid%' AND id NOT IN (1, 2))
UNION ALL
SELECT 'intencao_doacao', d.id, CONCAT(d.doador_nome, ' · ', d.quantidade_oferecida) FROM intencao_doacao d
 WHERE d.empresa_id IN (SELECT id FROM empresa WHERE nome = 'Empresa Teste Ltda')
    OR d.necessidade_id IN (SELECT n.id FROM necessidade n JOIN campanha c ON c.id = n.campanha_id
         WHERE (c.titulo = 'TESTE - Campanha de brinquedos' AND c.instituicao_id = 2));

-- Situação atual da campanha real (não será apagada), para comparar depois:
SELECT c.titulo, n.nome AS item, n.quantidade_meta AS meta,
       COALESCE(SUM(CASE WHEN d.recebida_em IS NOT NULL THEN d.quantidade_oferecida END), 0) AS recebido
  FROM campanha c JOIN necessidade n ON n.campanha_id = c.id
  LEFT JOIN intencao_doacao d ON d.necessidade_id = n.id
 WHERE c.id IN (1, 2)
 GROUP BY c.titulo, n.nome, n.quantidade_meta;
