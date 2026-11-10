CREATE TABLE instituicao (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    aprovada_em DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE campanha (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    instituicao_id BIGINT NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    descricao TEXT NOT NULL,
    publicada_em DATETIME(6),
    encerrada_em DATETIME(6),
    CONSTRAINT fk_campanha_instituicao FOREIGN KEY (instituicao_id) REFERENCES instituicao (id),
    CONSTRAINT ck_campanha_encerramento CHECK (
        encerrada_em IS NULL OR (publicada_em IS NOT NULL AND encerrada_em >= publicada_em)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE necessidade (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    campanha_id BIGINT NOT NULL,
    nome VARCHAR(160) NOT NULL,
    unidade VARCHAR(40) NOT NULL,
    quantidade_meta INT NOT NULL,
    CONSTRAINT fk_necessidade_campanha FOREIGN KEY (campanha_id) REFERENCES campanha (id),
    CONSTRAINT ck_necessidade_meta CHECK (quantidade_meta > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE intencao_doacao (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    necessidade_id BIGINT NOT NULL,
    doador_nome VARCHAR(160) NOT NULL,
    doador_contato VARCHAR(255) NOT NULL,
    quantidade_oferecida INT NOT NULL,
    registrada_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    recebida_em DATETIME(6),
    CONSTRAINT fk_intencao_necessidade FOREIGN KEY (necessidade_id) REFERENCES necessidade (id),
    CONSTRAINT ck_intencao_quantidade CHECK (quantidade_oferecida > 0),
    CONSTRAINT ck_intencao_recebimento CHECK (recebida_em IS NULL OR recebida_em >= registrada_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
