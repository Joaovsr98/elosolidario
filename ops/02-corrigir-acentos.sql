-- =====================================================================
-- Elo Brasil Solidário — correção de acentos perdidos
-- Os textos foram gravados sem os caracteres acentuados (ex.: "Instituio").
-- Os valores novos vão em hexadecimal UTF-8 para não dependerem da
-- configuração de caracteres do cliente usado para rodar o script.
-- Cada UPDATE só altera a linha se o texto atual for o errado esperado;
-- se já estiver correto (ou diferente), nada muda. Pode rodar de novo.
-- =====================================================================

SET NAMES utf8mb4;

-- "Instituio Horizonte (teste)" -> "Instituição Horizonte (teste)"
UPDATE instituicao
   SET nome = CONVERT(X'496E737469747569C3A7C3A36F20486F72697A6F6E74652028746573746529' USING utf8mb4)
 WHERE id = 1 AND nome = 'Instituio Horizonte (teste)';

-- "Instituto Esperanca (teste)" -> "Instituto Esperança (teste)"
UPDATE instituicao
   SET nome = CONVERT(X'496E7374697475746F204573706572616EC3A7612028746573746529' USING utf8mb4)
 WHERE id = 2 AND nome = 'Instituto Esperanca (teste)';

-- "Arrecadao de cadernos para a comunidade." -> "Arrecadação de cadernos para a comunidade."
UPDATE campanha
   SET descricao = CONVERT(X'4172726563616461C3A7C3A36F2064652063616465726E6F732070617261206120636F6D756E69646164652E' USING utf8mb4)
 WHERE id = 1 AND descricao = 'Arrecadao de cadernos para a comunidade.';

-- "Arrecadacao de casacos para a comunidade." -> "Arrecadação de casacos para a comunidade."
UPDATE campanha
   SET descricao = CONVERT(X'4172726563616461C3A7C3A36F2064652063617361636F732070617261206120636F6D756E69646164652E' USING utf8mb4)
 WHERE id = 2 AND descricao = 'Arrecadacao de casacos para a comunidade.';

-- Conferência. Se o console mostrar acento estranho, olhe a coluna hex:
-- "ção" deve aparecer como C3A7C3A36F e "ç" como C3A7.
SELECT 'instituicao' AS tabela, id, nome AS texto, HEX(nome) AS hex FROM instituicao WHERE id IN (1, 2)
UNION ALL
SELECT 'campanha', id, descricao, HEX(descricao) FROM campanha WHERE id IN (1, 2);
