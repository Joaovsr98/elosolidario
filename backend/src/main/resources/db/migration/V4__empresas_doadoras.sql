CREATE TABLE empresa (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    nome_normalizado VARCHAR(160) NOT NULL,
    criada_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_empresa_normalizado UNIQUE (nome_normalizado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE intencao_doacao
    ADD COLUMN empresa_id BIGINT NULL,
    ADD CONSTRAINT fk_intencao_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id);
