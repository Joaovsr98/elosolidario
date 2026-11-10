import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.ELO_DB ?? fileURLToPath(new URL('./elo-demo.sqlite', import.meta.url)));
const institution = 'Instituição Horizonte (fictícia)';
const token = randomBytes(24).toString('hex');
const port = Number(process.env.ELO_PORT ?? 3000);
const origin = 'http://127.0.0.1:' + port;

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS campanha (
    id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, item TEXT NOT NULL,
    meta INTEGER NOT NULL CHECK(meta > 0)
  );
  CREATE TABLE IF NOT EXISTS doacao (
    id INTEGER PRIMARY KEY, campanha_id INTEGER NOT NULL REFERENCES campanha(id),
    nome TEXT NOT NULL, contato TEXT NOT NULL, quantidade INTEGER NOT NULL CHECK(quantidade > 0),
    recebida_em TEXT
  );
  INSERT OR IGNORE INTO campanha VALUES (1, 'Campanha de material escolar', 'Caderno', 30);
`);

const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function page(res, title, content, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' });
  res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Elo Brasil Solidário</title>
    <style>
      *{box-sizing:border-box}body{margin:0;background:#f5faf7;color:#16372a;font:1rem system-ui}
      main{max-width:760px;margin:auto;padding:2rem 1rem}nav{display:flex;gap:1rem;flex-wrap:wrap}
      a{color:#165b43}article,section{background:white;border:1px solid #d4e5db;border-radius:1rem;padding:1.25rem;margin:1rem 0}
      label{display:block;margin:.7rem 0}input{display:block;width:100%;padding:.6rem;margin-top:.25rem;border:1px solid #779688;border-radius:.4rem}
      button{background:#165b43;color:white;border:0;border-radius:.4rem;padding:.75rem 1rem;font:inherit;cursor:pointer}
    </style>
    <main><nav><a href="/">Campanhas</a><a href="/painel">Painel da instituição</a></nav>
    <p>Elo Brasil Solidário · Demonstração local. Use dados fictícios.</p>
    <h1>${title}</h1>${content}</main></html>`);
}

function redirect(res, location, headers = {}) {
  res.writeHead(303, { Location: location, ...headers });
  res.end();
}

function field(name, label, max, numeric = false) {
  const limits = numeric ? 'type="number" min="1" max="1000000"' : `maxlength="${max}"`;
  return `<label>${label}<input name="${name}" required ${limits}></label>`;
}

async function form(req) {
  let body = '';
  for await (const chunk of req.setEncoding('utf8')) {
    body += chunk;
    if (body.length > 8192) throw new Error('Formulário muito grande.');
  }
  return new URLSearchParams(body);
}

const campaigns = db.prepare(`SELECT c.*, COALESCE(SUM(CASE WHEN d.recebida_em IS NOT NULL
  THEN d.quantidade END), 0) AS recebidas FROM campanha c
  LEFT JOIN doacao d ON d.campanha_id = c.id GROUP BY c.id ORDER BY c.id DESC`);

createServer(async (req, res) => {
  try {
    if (req.headers.host !== '127.0.0.1:' + port) return page(res, 'Endereço inválido', '', 403);
    const path = new URL(req.url, origin).pathname;
    const signedIn = (req.headers.cookie ?? '').split('; ').includes('elo=' + token);
    if (req.method === 'GET' && path === '/') {
      return page(res, 'Campanhas solidárias', campaigns.all().map(c => `<article>
        <h2>${escape(c.titulo)}</h2><p>${institution}</p>
        <p>${escape(c.item)} · ${c.recebidas} de ${c.meta} recebidos</p>
        <form method="post" action="/doar/${c.id}">
          ${field('nome', 'Nome fictício', 160)}${field('contato', 'Contato fictício', 255)}
          ${field('quantidade', 'Quantidade oferecida', 0, true)}
          <button>Registrar intenção de doar</button>
        </form></article>`).join(''));
    }
    if (req.method === 'GET' && path === '/obrigado') {
      return page(res, 'Intenção registrada', '<p>A instituição poderá consultar o contato informado para combinar a entrega.</p>');
    }
    if (req.method === 'GET' && path === '/painel') {
      if (!signedIn) return page(res, 'Acesso da instituição', `<form method="post" action="/entrar">
        <label>Código exibido no terminal<input type="password" name="codigo" required></label><button>Entrar</button></form>`);
      const donations = db.prepare(`SELECT d.*, c.titulo, c.item FROM doacao d
        JOIN campanha c ON c.id = d.campanha_id ORDER BY d.id DESC`).all();
      return page(res, 'Painel da instituição', `<p>${institution}</p><section><h2>Publicar campanha</h2>
        <form method="post" action="/campanhas">
          ${field('titulo', 'Título', 160)}${field('item', 'Item necessário', 160)}
          ${field('meta', 'Meta em unidades', 0, true)}<button>Publicar</button>
        </form></section><h2>Intenções de doação</h2>${donations.map(d => `<article>
        <h3>${escape(d.titulo)}</h3><p>${escape(d.nome)} · ${escape(d.contato)}</p>
        <p>${d.quantidade} × ${escape(d.item)}</p>${d.recebida_em ? '<p>Recebida</p>' :
          `<form method="post" action="/receber/${d.id}"><button>Confirmar recebimento</button></form>`}
        </article>`).join('') || '<p>Nenhuma intenção registrada.</p>'}`);
    }
    if (req.method !== 'POST') return page(res, 'Página não encontrada', '', 404);
    if (req.headers.origin !== origin) return page(res, 'Solicitação bloqueada', '', 403);
    const values = await form(req);
    const value = name => (values.get(name) ?? '').trim();
    const count = name => /^[1-9][0-9]{0,6}$/.test(value(name)) && Number(value(name)) <= 1000000
      ? Number(value(name)) : 0;
    const invalid = () => page(res, 'Confira os dados informados', '<p>Volte à página anterior e tente novamente.</p>', 400);

    if (path === '/entrar') {
      if (value('codigo') !== token) return page(res, 'Código inválido', '<a href="/painel">Tentar novamente</a>', 403);
      return redirect(res, '/painel', { 'Set-Cookie': 'elo=' + token + '; Path=/; HttpOnly; SameSite=Strict' });
    }
    const donation = path.match(/^\/doar\/([0-9]{1,15})$/);
    if (donation) {
      const id = Number(donation[1]);
      const nome = value('nome'), contato = value('contato'), quantidade = count('quantidade');
      if (!nome || nome.length > 160 || !contato || contato.length > 255 || !quantidade) return invalid();
      if (!db.prepare('SELECT id FROM campanha WHERE id = ?').get(id)) return page(res, 'Campanha não encontrada', '', 404);
      db.prepare('INSERT INTO doacao (campanha_id, nome, contato, quantidade) VALUES (?, ?, ?, ?)')
        .run(id, nome, contato, quantidade);
      return redirect(res, '/obrigado');
    }
    if (!signedIn) return page(res, 'Acesso restrito à instituição', '<a href="/painel">Entrar</a>', 403);
    if (path === '/campanhas') {
      const titulo = value('titulo'), item = value('item'), meta = count('meta');
      if (!titulo || titulo.length > 160 || !item || item.length > 160 || !meta) return invalid();
      db.prepare('INSERT INTO campanha (titulo, item, meta) VALUES (?, ?, ?)').run(titulo, item, meta);
      return redirect(res, '/painel');
    }
    const receipt = path.match(/^\/receber\/([0-9]{1,15})$/);
    if (receipt) {
      const id = Number(receipt[1]);
      if (!db.prepare('SELECT id FROM doacao WHERE id = ?').get(id)) return page(res, 'Doação não encontrada', '', 404);
      db.prepare("UPDATE doacao SET recebida_em = datetime('now') WHERE id = ? AND recebida_em IS NULL").run(id);
      return redirect(res, '/painel');
    }
    return page(res, 'Página não encontrada', '', 404);
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent && !res.destroyed) page(res, 'Erro ao processar a solicitação', '', 500);
  }
}).listen(port, '127.0.0.1', () => {
  console.log('Campanhas: ' + origin);
  console.log('Código da instituição: ' + token);
});

