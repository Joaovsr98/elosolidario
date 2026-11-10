// Ranking trimestral e diretório público de empresas doadoras.
// Só doações confirmadas pontuam; valores e quantidades nunca são expostos.

const INICIO_TRIMESTRE = 'MAKEDATE(YEAR(UTC_TIMESTAMP(6)), 1) + INTERVAL (QUARTER(UTC_TIMESTAMP(6)) - 1) * 3 MONTH';
const FIM_TRIMESTRE = 'MAKEDATE(YEAR(UTC_TIMESTAMP(6)), 1) + INTERVAL QUARTER(UTC_TIMESTAMP(6)) * 3 MONTH';

export async function empresas(req, res, db, json, path) {
  const reject = (status, erro) => json(res, status, { erro });
  if (req.method !== 'GET') return reject(405, 'Método indisponível');

  if (path === '/api/ranking') {
    const [rows] = await db.execute(`
      SELECT e.nome, COUNT(*) AS pontos
      FROM intencao_doacao d JOIN empresa e ON e.id = d.empresa_id
      WHERE d.recebida_em IS NOT NULL
        AND d.recebida_em >= ${INICIO_TRIMESTRE}
        AND d.recebida_em <  ${FIM_TRIMESTRE}
      GROUP BY e.id, e.nome
      ORDER BY pontos DESC, e.nome
      LIMIT 10
    `);
    return json(res, 200, rows);
  }

  if (path === '/api/empresas') {
    const q = (new URL(req.url, 'http://localhost').searchParams.get('q') ?? '').trim().slice(0, 160);
    const [rows] = await db.execute(`
      SELECT e.id, e.nome, COUNT(d.id) AS confirmadas, MIN(d.recebida_em) AS primeira
      FROM empresa e LEFT JOIN intencao_doacao d ON d.empresa_id = e.id AND d.recebida_em IS NOT NULL
      WHERE ? = '' OR e.nome LIKE CONCAT('%', ?, '%')
      GROUP BY e.id, e.nome
      ORDER BY e.nome
      LIMIT 100
    `, [q, q]);
    const [top] = await db.execute(`
      SELECT e.id FROM intencao_doacao d JOIN empresa e ON e.id = d.empresa_id
      WHERE d.recebida_em IS NOT NULL
        AND d.recebida_em >= ${INICIO_TRIMESTRE} AND d.recebida_em < ${FIM_TRIMESTRE}
      GROUP BY e.id ORDER BY COUNT(*) DESC, e.nome LIMIT 10
    `);
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
