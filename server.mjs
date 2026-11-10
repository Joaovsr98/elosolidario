import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { donations } from './doacoes.mjs';
import { createPool } from 'mysql2/promise';

if (!process.env.MYSQL_URL) throw new Error('Configure MYSQL_URL.');
const db = createPool(process.env.MYSQL_URL);
const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8']]);

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') {
      await db.query('SELECT hostname FROM instituicao LIMIT 0');
      return json(res, 200, { ok: true });
    }
    if (path.startsWith('/api/')) {
      const host = (req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
      const [[instituicao]] = await db.execute(
        'SELECT id, nome FROM instituicao WHERE hostname = ? AND aprovada_em IS NOT NULL', [host]);
      if (!instituicao) return json(res, 404, { erro: 'Instituição indisponível' });
      if (path !== '/api/campanhas') return await donations(req, res, db, json, path, host, instituicao.id);
      if (req.method !== 'GET') return json(res, 405, { erro: 'Método indisponível' });
      const [rows] = await db.execute(`
        SELECT c.id, c.titulo, c.descricao, n.id AS item_id, n.nome, n.unidade, n.quantidade_meta AS meta
        FROM campanha c LEFT JOIN necessidade n ON n.campanha_id = c.id
        WHERE c.instituicao_id = ? AND c.publicada_em <= UTC_TIMESTAMP(6)
          AND (c.encerrada_em IS NULL OR c.encerrada_em > UTC_TIMESTAMP(6))
        ORDER BY c.id DESC, n.id
      `, [instituicao.id]);
      const campanhas = new Map();
      for (const row of rows) {
        if (!campanhas.has(row.id)) campanhas.set(row.id, {
          id: row.id, titulo: row.titulo, descricao: row.descricao, itens: []
        });
        if (row.item_id !== null) campanhas.get(row.id).itens.push({
          id: row.item_id, nome: row.nome, unidade: row.unidade, meta: row.meta
        });
      }
      return json(res, 200, { instituicao: instituicao.nome, campanhas: [...campanhas.values()] });
    }
    if (req.method !== 'GET') return json(res, 405, { erro: 'Método indisponível' });
    const asset = path === '/' ? '/index.html' : path;
    const type = /^\/[a-zA-Z0-9_.-]+\.(html|js|css)$/.test(asset) && mime.get(asset.slice(asset.lastIndexOf('.')));
    if (!type) return json(res, 404, { erro: 'Página indisponível' });
    const content = await readFile(new URL('./dist/elo/browser' + asset, import.meta.url));
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') return json(res, 404, { erro: 'Arquivo indisponível' });
    console.error('Erro ao atender requisição:', error.code ?? error.name);
    json(res, 503, { erro: 'Serviço indisponível' });
  }
}).listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
