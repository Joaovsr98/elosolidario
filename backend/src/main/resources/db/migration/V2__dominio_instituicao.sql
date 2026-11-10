ALTER TABLE instituicao
    ADD COLUMN hostname VARCHAR(253) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
    ADD CONSTRAINT uq_instituicao_hostname UNIQUE (hostname);
