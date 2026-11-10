import { createHmac, timingSafeEqual } from 'node:crypto';

const keys = new Map(Object.entries(JSON.parse(process.env.ELO_PANEL_KEYS ?? '{}')));
for (const key of keys.values()) {
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw new Error('Chave de painel inválida.');
}

function matches(expected, actual) {
  return typeof actual === 'string' && Buffer.byteLength(actual) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function signature(key, host, expires) {
  return createHmac('sha256', key).update(host + ':' + expires).digest('hex');
}

async function body(req) {
  let data = '';
  for await (const chunk of req.setEncoding('utf8')) {
    data += chunk;
    if (data.length > 4096) return null;
  }
  try { return JSON.parse(data); } catch { return null; }
}

export async function donations(req, res, db, json, path, host, institution) {
  const key = keys.get(host);
  const cookie = (req.headers.cookie ?? '').match(/(?:^|;\s*)elo_panel=(\d+)\.([a-f0-9]{64})(?:;|$)/);
  const authorized = key && cookie && Number(cookie[1]) > Date.now()
    && matches(signature(key, host, cookie[1]), cookie[2]);
  const reject = (status, erro) => json(res, status, { erro });

  if (req.method === 'POST') {
    const origin = req.headers.origin;
    if ((origin !== 'https://' + req.headers.host &&
         !(host === 'localhost' && origin === 'http://' + req.headers.host))
        || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
      return reject(403, 'Origem inválida.');
    }
    const data = await body(req);
    if (!data || typeof data !== 'object') return reject(400, 'Confira os dados.');
    if (path === '/api/painel/entrar') {
      if (!key) return reject(503, 'Painel ainda não configurado.');
      if (!matches(key, data.codigo)) return reject(401, 'Código inválido.');
      const expires = Date.now() + 28_800_000;
      res.setHeader('Set-Cookie', 'elo_panel=' + expires + '.' + signature(key, host, expires)
        + '; Path=/api/painel; Max-Age=28800; HttpOnly; SameSite=Strict' + (host === 'localhost' ? '' : '; Secure'));
      return json(res, 200, { ok: true });
    }
    if (path === '/api/painel/sair') {
      res.setHeader('Set-Cookie', 'elo_panel=; Path=/api/painel; Max-Age=0; HttpOnly; SameSite=Strict'
        + (host === 'localhost' ? '' : '; Secure'));
      return json(res, 200, { ok: true });
    }
    if (path === '/api/doacoes') {
      const nome = typeof data.nome === 'string' ? data.nome.trim() : '';
      const contato = typeof data.contato === 'string' ? data.contato.trim() : '';
      if (!nome || nome.length > 160 || !contato || contato.length > 255
        || !Number.isSafeInteger(data.item) || data.item < 1
        || !Number.isSafeInteger(data.quantidade) || data.quantidade < 1 || data.quantidade > 1000000) {
        return reject(400, 'Confira os dados da doação.');
      }
      const [result] = await db.execute(`
        INSERT INTO intencao_doacao (necessidade_id, doador_nome, doador_contato, quantidade_oferecida)
        SELECT n.id, ?, ?, ? FROM necessidade n JOIN campanha c ON c.id = n.campanha_id
        WHERE n.id = ? AND c.instituicao_id = ? AND c.publicada_em <= UTC_TIMESTAMP(6)
          AND (c.encerrada_em IS NULL OR c.encerrada_em > UTC_TIMESTAMP(6))
      `, [nome, contato, data.quantidade, data.item, institution]);
      return result.affectedRows ? json(res, 201, { ok: true }) : reject(404, 'Item indisponível.');
    }
    if (path === '/api/painel/receber') {
      if (!authorized) return reject(401, 'Entre no painel.');
      if (!Number.isSafeInteger(data.id) || data.id < 1) return reject(400, 'Doação inválida.');
      const [result] = await db.execute(`
        UPDATE intencao_doacao d JOIN necessidade n ON n.id = d.necessidade_id
        JOIN campanha c ON c.id = n.campanha_id
        SET d.recebida_em = COALESCE(d.recebida_em, GREATEST(CURRENT_TIMESTAMP(6), d.registrada_em))
        WHERE d.id = ? AND c.instituicao_id = ?
      `, [data.id, institution]);
      return result.affectedRows ? json(res, 200, { ok: true }) : reject(404, 'Doação indisponível.');
    }
  }
  if (req.method === 'GET' && path === '/api/painel/doacoes') {
    if (!authorized) return reject(401, 'Entre no painel.');
    const [rows] = await db.execute(`
      SELECT d.id, d.doador_nome AS nome, d.doador_contato AS contato, d.quantidade_oferecida AS quantidade,
             d.recebida_em IS NOT NULL AS recebida, n.nome AS item, c.titulo AS campanha
      FROM intencao_doacao d JOIN necessidade n ON n.id = d.necessidade_id
      JOIN campanha c ON c.id = n.campanha_id WHERE c.instituicao_id = ? ORDER BY d.id DESC
    `, [institution]);
    return json(res, 200, rows);
  }
  return reject(404, 'Rota indisponível.');
}
