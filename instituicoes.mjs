import { randomBytes } from 'node:crypto';
import { sha256, matches, signature, originRejected, body } from './doacoes.mjs';

const adminRaw = typeof process.env.ELO_ADMIN_KEY === 'string' ? process.env.ELO_ADMIN_KEY.trim() : '';
const adminKey = /^[a-f0-9]{64}$/.test(adminRaw) ? adminRaw : undefined;
if (adminRaw && !adminKey) {
  console.error('ELO_ADMIN_KEY ignorada: use 64 caracteres hexadecimais minúsculos. Administração desligada.');
}

function texto(valor, max) {
  const limpo = typeof valor === 'string' ? valor.trim() : '';
  return limpo && limpo.length <= max ? limpo : null;
}

export async function cadastro(req, res, db, json) {
  const reject = (status, erro) => json(res, status, { erro });
  const host = (req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
  if (req.method !== 'POST') return reject(405, 'Método indisponível');
  if (originRejected(req, host)) return reject(403, 'Origem inválida.');
  const data = await body(req);
  if (!data || typeof data !== 'object') return reject(400, 'Confira os dados.');
  const responsavel = data.responsavel && typeof data.responsavel === 'object' ? data.responsavel : {};
  const nome = texto(data.nome, 160);
  const respNome = texto(responsavel.nome, 160);
  const respContato = texto(responsavel.contato, 255);
  const contato = typeof data.contato === 'string' && data.contato.trim()
    ? texto(data.contato, 255) : '';
  if (!nome || !respNome || !respContato || contato === null) {
    return reject(400, 'Confira os dados do cadastro.');
  }
  if (data.consentimento !== true) return reject(400, 'É necessário concordar com o uso dos dados (LGPD).');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [inst] = await conn.execute(
      'INSERT INTO instituicao (nome, contato) VALUES (?, ?)', [nome, contato || null]);
    await conn.execute(
      'INSERT INTO responsavel (instituicao_id, nome, contato) VALUES (?, ?, ?)',
      [inst.insertId, respNome, respContato]);
    await conn.commit();
    return json(res, 201, { ok: true });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function explorar(req, res, db, json) {
  const reject = (status, erro) => json(res, status, { erro });
  if (req.method !== 'GET') return reject(405, 'Método indisponível');
  const q = (new URL(req.url, 'http://localhost').searchParams.get('q') ?? '').trim().slice(0, 160);
  const [rows] = await db.execute(`
    SELECT i.id, i.nome, i.hostname, c.id AS campanha_id, c.titulo,
           (SELECT COUNT(*) FROM necessidade n WHERE n.campanha_id = c.id) AS itens
    FROM instituicao i
    JOIN campanha c ON c.instituicao_id = i.id
      AND c.publicada_em <= UTC_TIMESTAMP(6)
      AND (c.encerrada_em IS NULL OR c.encerrada_em > UTC_TIMESTAMP(6))
    WHERE i.aprovada_em IS NOT NULL AND i.hostname IS NOT NULL
      AND (? = '' OR i.nome LIKE CONCAT('%', ?, '%') OR c.titulo LIKE CONCAT('%', ?, '%'))
    ORDER BY i.nome, c.id DESC
    LIMIT 200
  `, [q, q, q]);
  const instituicoes = new Map();
  for (const row of rows) {
    if (!instituicoes.has(row.id)) instituicoes.set(row.id, {
      id: row.id, nome: row.nome, hostname: row.hostname, campanhas: []
    });
    instituicoes.get(row.id).campanhas.push({ id: row.campanha_id, titulo: row.titulo, itens: Number(row.itens) });
  }
  return json(res, 200, [...instituicoes.values()]);
}

export async function admin(req, res, db, json, path) {
  const reject = (status, erro) => json(res, status, { erro });
  const host = (req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
  const cookie = (req.headers.cookie ?? '').match(/(?:^|;\s*)elo_admin=(\d+)\.([a-f0-9]{64})(?:;|$)/);
  const authorized = adminKey && cookie && Number(cookie[1]) > Date.now()
    && matches(signature(adminKey, 'admin', cookie[1]), cookie[2]);

  if (req.method === 'POST') {
    if (originRejected(req, host)) return reject(403, 'Origem inválida.');
    const data = await body(req);
    if (!data || typeof data !== 'object') return reject(400, 'Confira os dados.');
    if (path === '/api/admin/entrar') {
      if (!adminKey) return reject(503, 'Administração não configurada.');
      if (typeof data.codigo !== 'string' || !matches(adminKey, data.codigo)) {
        return reject(401, 'Chave inválida.');
      }
      const expires = Date.now() + 28_800_000;
      res.setHeader('Set-Cookie', 'elo_admin=' + expires + '.' + signature(adminKey, 'admin', expires)
        + '; Path=/api/admin; Max-Age=28800; HttpOnly; SameSite=Strict' + (host === 'localhost' ? '' : '; Secure'));
      return json(res, 200, { ok: true });
    }
    if (path === '/api/admin/sair') {
      res.setHeader('Set-Cookie', 'elo_admin=; Path=/api/admin; Max-Age=0; HttpOnly; SameSite=Strict'
        + (host === 'localhost' ? '' : '; Secure'));
      return json(res, 200, { ok: true });
    }
    if (!authorized) return reject(401, 'Entre como administrador.');
    if (path === '/api/admin/aprovar') {
      if (!Number.isSafeInteger(data.id) || data.id < 1) return reject(400, 'Instituição inválida.');
      const hostname = typeof data.hostname === 'string' ? data.hostname.trim().toLowerCase() : '';
      if (!/^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(hostname)) {
        return reject(400, 'Domínio inválido.');
      }
      const codigo = randomBytes(32).toString('hex');
      try {
        const [result] = await db.execute(`
          UPDATE instituicao
          SET hostname = ?, codigo_hash = ?, aprovada_em = COALESCE(aprovada_em, UTC_TIMESTAMP(6))
          WHERE id = ?
        `, [hostname, sha256(codigo), data.id]);
        return result.affectedRows ? json(res, 200, { ok: true, codigo }) : reject(404, 'Instituição indisponível.');
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return reject(409, 'Domínio já usado por outra instituição.');
        throw error;
      }
    }
    if (path === '/api/admin/codigo') {
      if (!Number.isSafeInteger(data.id) || data.id < 1) return reject(400, 'Instituição inválida.');
      const codigo = randomBytes(32).toString('hex');
      const [result] = await db.execute(
        'UPDATE instituicao SET codigo_hash = ? WHERE id = ? AND aprovada_em IS NOT NULL',
        [sha256(codigo), data.id]);
      return result.affectedRows ? json(res, 200, { ok: true, codigo }) : reject(404, 'Instituição indisponível.');
    }
    if (path === '/api/admin/recusar') {
      if (!Number.isSafeInteger(data.id) || data.id < 1) return reject(400, 'Instituição inválida.');
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [[pendente]] = await conn.execute(
          'SELECT id FROM instituicao WHERE id = ? AND aprovada_em IS NULL AND hostname IS NULL FOR UPDATE', [data.id]);
        if (!pendente) { await conn.rollback(); return reject(404, 'Cadastro pendente indisponível.'); }
        await conn.execute('DELETE FROM responsavel WHERE instituicao_id = ?', [data.id]);
        await conn.execute('DELETE FROM instituicao WHERE id = ?', [data.id]);
        await conn.commit();
        console.info('Admin recusou cadastro pendente', data.id);
        return json(res, 200, { ok: true });
      } catch (error) {
        await conn.rollback();
        if (error.code === 'ER_ROW_IS_REFERENCED_2') return reject(409, 'Cadastro já possui registros vinculados.');
        throw error;
      } finally {
        conn.release();
      }
    }
    if (path === '/api/admin/campanhas/encerrar') {
      if (!Number.isSafeInteger(data.id) || data.id < 1) return reject(400, 'Campanha inválida.');
      const [result] = await db.execute(`
        UPDATE campanha SET encerrada_em = COALESCE(encerrada_em, GREATEST(UTC_TIMESTAMP(6), publicada_em))
        WHERE id = ? AND publicada_em IS NOT NULL
      `, [data.id]);
      if (result.affectedRows) console.info('Admin encerrou campanha', data.id);
      return result.affectedRows ? json(res, 200, { ok: true }) : reject(404, 'Campanha indisponível.');
    }
  }
  if (req.method === 'GET' && path === '/api/admin/campanhas') {
    if (!authorized) return reject(401, 'Entre como administrador.');
    const [rows] = await db.execute(`
      SELECT c.id, c.titulo, i.nome AS instituicao
      FROM campanha c JOIN instituicao i ON i.id = c.instituicao_id
      WHERE c.publicada_em <= UTC_TIMESTAMP(6) AND (c.encerrada_em IS NULL OR c.encerrada_em > UTC_TIMESTAMP(6))
      ORDER BY c.id DESC LIMIT 200
    `);
    return json(res, 200, rows);
  }
  if (req.method === 'GET' && path === '/api/admin/indicadores') {
    if (!authorized) return reject(401, 'Entre como administrador.');
    const [[linha]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM instituicao WHERE aprovada_em IS NOT NULL) AS aprovadas,
        (SELECT COUNT(*) FROM instituicao WHERE aprovada_em IS NULL) AS pendentes,
        (SELECT COUNT(*) FROM campanha WHERE publicada_em <= UTC_TIMESTAMP(6)
           AND (encerrada_em IS NULL OR encerrada_em > UTC_TIMESTAMP(6))) AS campanhas,
        (SELECT COUNT(*) FROM intencao_doacao) AS intencoes,
        (SELECT COUNT(*) FROM intencao_doacao WHERE recebida_em IS NOT NULL) AS recebidas,
        (SELECT COUNT(*) FROM empresa) AS empresas
    `);
    return json(res, 200, Object.fromEntries(Object.entries(linha).map(([chave, valor]) => [chave, Number(valor)])));
  }
  if (req.method === 'GET' && path === '/api/admin/instituicoes') {
    if (!authorized) return reject(401, 'Entre como administrador.');
    const [rows] = await db.execute(`
      SELECT i.id, i.nome, i.hostname, i.contato, i.aprovada_em IS NOT NULL AS aprovada,
             r.id AS resp_id, r.nome AS resp_nome, r.contato AS resp_contato
      FROM instituicao i LEFT JOIN responsavel r ON r.instituicao_id = i.id
      ORDER BY i.aprovada_em IS NOT NULL, i.id DESC, r.id
    `);
    const instituicoes = new Map();
    for (const row of rows) {
      if (!instituicoes.has(row.id)) instituicoes.set(row.id, {
        id: row.id, nome: row.nome, hostname: row.hostname, contato: row.contato,
        aprovada: !!row.aprovada, responsaveis: []
      });
      if (row.resp_id !== null) instituicoes.get(row.id).responsaveis.push({
        id: row.resp_id, nome: row.resp_nome, contato: row.resp_contato
      });
    }
    return json(res, 200, [...instituicoes.values()]);
  }
  return reject(404, 'Rota indisponível.');
}
