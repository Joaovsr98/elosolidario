import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

process.env.ELO_ADMIN_KEY = 'a'.repeat(64);
const { donations, sha256, signature, body } = await import('../doacoes.mjs');
const { cadastro, admin, explorar } = await import('../instituicoes.mjs');
const { empresas } = await import('../empresas.mjs');

const host = 'instituicao-ficticia.example';
const inst = { id: 13, nome: 'Instituição Fictícia', codigo_hash: sha256('codigo-de-teste') };
function fakeTransacao(affectedRows = 1) {
  const calls = [];
  const state = { commit: 0, rollback: 0, release: 0 };
  const connection = {
    async beginTransaction() {},
    async execute(sql, params) { calls.push([sql, params]); return [{ affectedRows, insertId: 25 }]; },
    async commit() { state.commit++; },
    async rollback() { state.rollback++; },
    release() { state.release++; }
  };
  return { db: { async getConnection() { return connection; } }, calls, state };
}
function cookie(i = inst, h = host) {
  const expires = Date.now() + 60_000;
  return 'elo_panel=' + expires + '.' + signature(i.codigo_hash, h, expires);
}
async function run(handler, { method = 'GET', path = '/', data, headers = {}, institution = inst, hostname = host } = {}, db = {}) {
  const req = Readable.from(method === 'POST' ? [JSON.stringify(data ?? {})] : []);
  req.method = method;
  req.url = path;
  req.headers = {
    host: hostname, origin: 'https://' + hostname, 'content-type': 'application/json', ...headers
  };
  const res = { headers: {}, setHeader(n, v) { this.headers[n.toLowerCase()] = v; } };
  const json = (response, status, payload) => ({ status, payload });
  // O roteador real fornece apenas URL.pathname ao handler, sem a query string.
  const routePath = new URL(path, 'http://localhost').pathname;
  let result;
  if (handler === donations) result = await handler(req, res, db, json, routePath, hostname, institution);
  else if (handler === admin || handler === empresas) result = await handler(req, res, db, json, routePath);
  else result = await handler(req, res, db, json);
  return { ...result, headers: res.headers };
}

test('doação bloqueada sem consentimento LGPD', async () => {
  const r = await run(donations, {
    method: 'POST', path: '/api/doacoes',
    data: { nome: 'Teste', contato: 'contato', item: 2, quantidade: 1 }
  });
  assert.equal(r.status, 400);
  assert.match(r.payload.erro, /LGPD/);
});
test('origem externa recebe 403 antes da gravação', async () => {
  const r = await run(donations, {
    method: 'POST', path: '/api/doacoes', headers: { origin: 'https://atacante.invalid' },
    data: { nome: 'Teste', contato: 'contato', item: 2, quantidade: 1, consentimento: true }
  });
  assert.equal(r.status, 403);
});
test('quantidades inválidas são recusadas', async () => {
  for (const quantidade of [0, -2, 1.5, 1_000_001]) {
    const r = await run(donations, {
      method: 'POST', path: '/api/doacoes',
      data: { nome: 'Teste', contato: 'contato', item: 2, quantidade, consentimento: true }
    });
    assert.equal(r.status, 400);
  }
});
test('doação válida limita a consulta à instituição do servidor', async () => {
  const f = fakeTransacao();
  const r = await run(donations, {
    method: 'POST', path: '/api/doacoes',
    data: { nome: 'Pessoa Fictícia', contato: 'exemplo@example.invalid', item: 99, quantidade: 3, consentimento: true }
  }, f.db);
  assert.equal(r.status, 201);
  assert.deepEqual(f.state, { commit: 1, rollback: 0, release: 1 });
  assert.equal(f.calls[0][1].at(-1), inst.id);
  assert.match(f.calls[0][0], /c\.instituicao_id\s*=\s*\?/);
  assert.match(f.calls[0][0], /c\.publicada_em\s*<=/);
});
test('item inexistente desfaz transação sem registrar doação', async () => {
  const f = fakeTransacao(0);
  const r = await run(donations, {
    method: 'POST', path: '/api/doacoes',
    data: { nome: 'Pessoa Fictícia', contato: 'exemplo', item: 99, quantidade: 3, consentimento: true }
  }, f.db);
  assert.equal(r.status, 404);
  assert.deepEqual(f.state, { commit: 0, rollback: 1, release: 1 });
});
test('painel de doações exige sessão', async () => {
  const r = await run(donations, { path: '/api/painel/doacoes' });
  assert.equal(r.status, 401);
});
test('cookie de outra instituição não libera consulta', async () => {
  const r = await run(donations, {
    path: '/api/painel/doacoes',
    hostname: 'outra.example',
    institution: { id: 50, codigo_hash: sha256('codigo-diferente') },
    headers: { cookie: cookie() }
  });
  assert.equal(r.status, 401);
});
test('confirmação do recebimento inclui filtro de instituição no SQL', async () => {
  let captured;
  const db = { async execute(sql, params) { captured = { sql, params }; return [{ affectedRows: 1 }]; } };
  const r = await run(donations, {
    method: 'POST', path: '/api/painel/receber',
    headers: { cookie: cookie() }, data: { id: 71 }
  }, db);
  assert.equal(r.status, 200);
  assert.match(captured.sql, /c\.instituicao_id\s*=\s*\?/);
  assert.deepEqual(captured.params, [71, inst.id]);
});
test('painel não permite criar campanha sem sessão', async () => {
  const r = await run(donations, {
    method: 'POST', path: '/api/painel/campanhas',
    data: { titulo: 'Exemplo', descricao: 'Exemplo', itens: [{ nome: 'Cestas', unidade: 'un', meta: 4 }] }
  });
  assert.equal(r.status, 401);
});
test('cadastro exige consentimento', async () => {
  const r = await run(cadastro, {
    method: 'POST', path: '/api/cadastro',
    data: { nome: 'ONG fictícia', responsavel: { nome: 'Responsável', contato: 'contato' } }
  });
  assert.equal(r.status, 400);
});
test('cadastro de instituição e responsável é transacional', async () => {
  const f = fakeTransacao();
  const r = await run(cadastro, {
    method: 'POST', path: '/api/cadastro',
    data: { nome: 'ONG Fictícia', responsavel: { nome: 'Responsável', contato: 'exemplo@example.invalid' }, consentimento: true }
  }, f.db);
  assert.equal(r.status, 201);
  assert.deepEqual(f.state, { commit: 1, rollback: 0, release: 1 });
  assert.equal(f.calls.length, 2);
});
test('admin não expõe lista de instituições sem autenticação', async () => {
  const r = await run(admin, { path: '/api/admin/instituicoes' });
  assert.equal(r.status, 401);
});
test('login administrativo valida chave e define cookie seguro', async () => {
  const bad = await run(admin, { method: 'POST', path: '/api/admin/entrar', data: { codigo: 'incorreta' } });
  assert.equal(bad.status, 401);
  const good = await run(admin, {
    method: 'POST', path: '/api/admin/entrar', data: { codigo: 'a'.repeat(64) }
  });
  assert.equal(good.status, 200);
  assert.match(good.headers['set-cookie'], /HttpOnly/);
  assert.match(good.headers['set-cookie'], /SameSite=Strict/);
  assert.match(good.headers['set-cookie'], /Secure/);
});
test('ranking trimestral só considera doações recebidas', async () => {
  let captured;
  const db = { async execute(sql, params) {
    captured = { sql, params };
    return [[{ nome: 'Empresa exemplo', pontos: 2 }]];
  } };
  const r = await run(empresas, { path: '/api/ranking?ano=2026&tri=4' }, db);
  assert.equal(r.status, 200);
  assert.match(captured.sql, /d\.recebida_em IS NOT NULL/);
  assert.deepEqual(captured.params, ['2026-10-01 00:00:00', '2027-01-01 00:00:00']);
});
test('explorar só consulta instituições aprovadas e campanhas abertas', async () => {
  let sql;
  const db = { async execute(query) {
    sql = query;
    return [[{ id: 3, nome: 'Teste', hostname: 'teste.example', campanha_id: 7, titulo: 'Exemplo', itens: 2 }]];
  } };
  const r = await run(explorar, { path: '/api/explorar?q=teste' }, db);
  assert.equal(r.status, 200);
  assert.equal(r.payload.length, 1);
  assert.match(sql, /i\.aprovada_em IS NOT NULL/);
  assert.match(sql, /c\.publicada_em <= UTC_TIMESTAMP/);
});
test('corpos acima do limite são rejeitados', async () => {
  const req = Readable.from(['"' + 'x'.repeat(20_000) + '"']);
  assert.equal(await body(req), null);
});
