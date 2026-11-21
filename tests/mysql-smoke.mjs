import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

if (!process.env.TEST_MYSQL_URL) throw Error('TEST_MYSQL_URL obrigatório: use somente banco descartável de CI');
const db = await mysql.createConnection(process.env.TEST_MYSQL_URL);
try {
  for (const filename of [
    'V1__campanhas_e_doacoes.sql',
    'V2__dominio_instituicao.sql',
    'V3__acesso_instituicao.sql',
    'V4__empresas_doadoras.sql'
  ]) {
    const contents = await readFile(new URL('../backend/src/main/resources/db/migration/' + filename, import.meta.url), 'utf8');
    for (const statement of contents.split(';').map(s => s.trim()).filter(Boolean)) {
      await db.query(statement);
    }
    console.info('Migração MySQL aplicada:', filename);
  }
  const [a] = await db.execute(
    'INSERT INTO instituicao(nome, hostname, aprovada_em) VALUES (?, ?, UTC_TIMESTAMP(6))',
    ['Instituição A fictícia', 'instituicao-a.test']);
  const [b] = await db.execute(
    'INSERT INTO instituicao(nome, hostname, aprovada_em) VALUES (?, ?, UTC_TIMESTAMP(6))',
    ['Instituição B fictícia', 'instituicao-b.test']);
  assert.notEqual(a.insertId, b.insertId);
  await assert.rejects(
    db.execute('INSERT INTO instituicao(nome, hostname) VALUES (?, ?)', ['Duplicada', 'instituicao-a.test']),
    /Duplicate entry/);

  const [campaign] = await db.execute(
    'INSERT INTO campanha(instituicao_id, titulo, descricao, publicada_em) VALUES (?, ?, ?, UTC_TIMESTAMP(6))',
    [a.insertId, 'Campanha de teste', 'Somente ambiente CI']);
  const [need] = await db.execute(
    'INSERT INTO necessidade(campanha_id, nome, unidade, quantidade_meta) VALUES (?, ?, ?, ?)',
    [campaign.insertId, 'Cobertor', 'un', 5]);
  await assert.rejects(
    db.execute('INSERT INTO necessidade(campanha_id, nome, unidade, quantidade_meta) VALUES (?, ?, ?, ?)',
      [campaign.insertId, 'Meta zero', 'un', 0]), /Check constraint|CONSTRAINT/i);

  const [donation] = await db.execute(
    'INSERT INTO intencao_doacao(necessidade_id,doador_nome,doador_contato,quantidade_oferecida) VALUES (?,?,?,?)',
    [need.insertId, 'Pessoa fictícia', 'contato@example.invalid', 2]);
  await db.execute('UPDATE intencao_doacao SET recebida_em = GREATEST(CURRENT_TIMESTAMP(6), registrada_em) WHERE id = ?',
    [donation.insertId]);
  const [[progress]] = await db.execute(
    'SELECT COALESCE(SUM(quantidade_oferecida),0) AS total FROM intencao_doacao WHERE necessidade_id = ? AND recebida_em IS NOT NULL',
    [need.insertId]);
  assert.equal(Number(progress.total), 2);

  await assert.rejects(
    db.execute('INSERT INTO intencao_doacao(necessidade_id,doador_nome,doador_contato,quantidade_oferecida) VALUES (?,?,?,?)',
      [999999, 'Sem item', 'contato@example.invalid', 1]),
    /foreign key constraint/i);
  console.info('Aprovado: migrations V1-V4, hostname único, constraints, recebimento e progresso.');
} finally {
  await db.end();
}
