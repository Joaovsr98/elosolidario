// Ranking trimestral e diretório público de empresas doadoras.
// Só doações confirmadas pontuam; valores e quantidades nunca são expostos.

// Limites do trimestre pedido (ano/tri validados) ou do trimestre atual, em UTC.
function trimestre(params) {
  const agora = new Date();
  let ano = Number(params.get('ano'));
  let tri = Number(params.get('tri'));
  if (!Number.isInteger(ano) || ano < 2020 || ano > 2100 || !Number.isInteger(tri) || tri < 1 || tri > 4) {
    ano = agora.getUTCFullYear();
    tri = Math.floor(agora.getUTCMonth() / 3) + 1;
  }
  const mes = (n) => String(n).padStart(2, '0');
  const inicio = `${ano}-${mes((tri - 1) * 3 + 1)}-01 00:00:00`;
  const fim = tri === 4 ? `${ano + 1}-01-01 00:00:00` : `${ano}-${mes(tri * 3 + 1)}-01 00:00:00`;
  return { inicio, fim };
}

export async function empresas(req, res, db, json, path) {
  const reject = (status, erro) => json(res, status, { erro });
  if (req.method !== 'GET') return reject(405, 'Método indisponível');
  const params = new URL(req.url, 'http://localhost').searchParams;

  if (path === '/api/ranking') {
    const { inicio, fim } = trimestre(params);
    const [rows] = await db.execute(`
      SELECT e.nome, COUNT(*) AS pontos
      FROM intencao_doacao d JOIN empresa e ON e.id = d.empresa_id
      WHERE d.recebida_em IS NOT NULL AND d.recebida_em >= ? AND d.recebida_em < ?
      GROUP BY e.id, e.nome
      ORDER BY pontos DESC, e.nome
      LIMIT 10
    `, [inicio, fim]);
    return json(res, 200, rows);
  }

  if (path === '/api/empresas') {
    const q = (params.get('q') ?? '').trim().slice(0, 160);
    // Sem busca, a ordem do mural muda a cada dia para dar visibilidade a empresas menores e novas.
    const ordem = q ? 'e.nome' : "CRC32(CONCAT(e.id, '-', UTC_DATE())), e.nome";
    const [rows] = await db.execute(`
      SELECT e.id, e.nome, COUNT(d.id) AS confirmadas, MIN(d.recebida_em) AS primeira
      FROM empresa e LEFT JOIN intencao_doacao d ON d.empresa_id = e.id AND d.recebida_em IS NOT NULL
      WHERE ? = '' OR e.nome LIKE CONCAT('%', ?, '%')
      GROUP BY e.id, e.nome
      ORDER BY ${ordem}
      LIMIT 100
    `, [q, q]);
    const atual = trimestre(new URLSearchParams());
    const [top] = await db.execute(`
      SELECT e.id FROM intencao_doacao d JOIN empresa e ON e.id = d.empresa_id
      WHERE d.recebida_em IS NOT NULL AND d.recebida_em >= ? AND d.recebida_em < ?
      GROUP BY e.id ORDER BY COUNT(*) DESC, e.nome LIMIT 10
    `, [atual.inicio, atual.fim]);
    const destaque = new Set(top.map(linha => linha.id));
    const agora = Date.now();
    const resultado = rows.map(linha => {
      const confirmadas = Number(linha.confirmadas);
      const selos = [];
      if (confirmadas >= 1) selos.push('Primeiro Elo');
      if (confirmadas >= 3) selos.push('Elo Constante');
      if (linha.primeira && agora - new Date(linha.primeira).getTime() <= 30 * 86400000) selos.push('Elo em Ascensão');
      if (destaque.has(linha.id)) selos.push('Destaque Solidário');
      return { nome: linha.nome, confirmadas, selos };
    });
    return json(res, 200, resultado);
  }

  return reject(404, 'Rota indisponível.');
}
