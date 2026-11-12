// Executa um script .sql da pasta ops/ no MySQL do Railway.
//
// Uso (PowerShell, dentro da pasta "Elo cdx"):
//   $env:ELO_DB_URL = "<MYSQL_PUBLIC_URL copiado do Railway>"
//   node ops/rodar-sql.mjs ops/01a-limpeza-conferir.sql
//   node ops/rodar-sql.mjs ops/01b-limpeza-executar.sql --confirmar
//
// Segurança:
// - O endereço do banco vem só da variável ELO_DB_URL (nunca de arquivo) e nunca é impresso.
// - Só roda arquivos .sql de dentro da pasta ops/.
// - Scripts que alteram dados (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, GRANT...) exigem --confirmar.

import { readFile } from 'node:fs/promises';
import { resolve, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'mysql2/promise';

const [arquivo, ...flags] = process.argv.slice(2);
const pastaOps = fileURLToPath(new URL('.', import.meta.url));

function sair(mensagem) {
  console.error('\n' + mensagem + '\n');
  process.exit(1);
}

if (!arquivo) sair('Uso: node ops/rodar-sql.mjs ops/<arquivo>.sql [--confirmar]');

const caminho = resolve(arquivo);
const relativo = relative(pastaOps, caminho);
if (!caminho.endsWith('.sql') || relativo.startsWith('..') || isAbsolute(relativo) || relativo.includes(sep)) {
  sair('Só é permitido rodar arquivos .sql que estejam diretamente na pasta ops/.');
}

const url = process.env.ELO_DB_URL ?? '';
if (!/^mysql:\/\//.test(url)) {
  sair('Defina a variável ELO_DB_URL com o MYSQL_PUBLIC_URL do Railway. No PowerShell:\n'
    + '  $env:ELO_DB_URL = "mysql://..."\n'
    + '(Ela vale só para esta janela do terminal. Não salve em arquivo nem cole no chat.)');
}

let sql = await readFile(caminho, 'utf8');
const semComentarios = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');

// Marcadores {{NOME}}: {{BANCO_ATUAL}} vem do próprio ELO_DB_URL; os demais (senhas) vêm de
// variáveis do terminal, para nunca ficarem gravados em arquivo.
const segredos = [];
sql = sql.replace(/\{\{([A-Z_]+)\}\}/g, (_, nome) => {
  if (nome === 'BANCO_ATUAL') {
    const banco = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    if (!/^[A-Za-z0-9_]+$/.test(banco)) sair('Não consegui identificar o nome do banco no ELO_DB_URL.');
    return banco;
  }
  const valor = process.env[nome] ?? '';
  if (valor.length < 16) {
    sair(`Defina a variável ${nome} com a senha gerada (mínimo 16 caracteres). No PowerShell:\n`
      + `  $env:${nome} = "..."`);
  }
  segredos.push(valor);
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "''");
});
const mascarar = (texto) => segredos.reduce((saida, segredo) => saida.split(segredo).join('***'), String(texto));
const alteraDados = /\b(insert|update|delete|create|drop|alter|grant|revoke|truncate|rename)\b/i.test(semComentarios);
if (alteraDados && !flags.includes('--confirmar')) {
  sair('Este script ALTERA dados. Confira antes e, se estiver tudo certo, rode de novo com --confirmar no final.');
}

console.log(`\nConectando ao banco e rodando ${relativo}${alteraDados ? ' (altera dados)' : ' (somente leitura)'}...`);

let conexao;
try {
  conexao = await createConnection({ uri: url, multipleStatements: true, charset: 'utf8mb4', connectTimeout: 20000 });
  const [resultados] = await conexao.query(sql);
  const lista = Array.isArray(resultados) && resultados.length
    && (Array.isArray(resultados[0]) || typeof resultados[0]?.affectedRows === 'number') ? resultados : [resultados];
  lista.forEach((resultado, indice) => {
    const numero = `#${indice + 1}`;
    if (Array.isArray(resultado)) {
      if (resultado.length) {
        console.log(`\n${numero} — ${resultado.length} linha(s):`);
        console.table(resultado);
      } else {
        console.log(`\n${numero} — consulta sem resultados.`);
      }
    } else if (typeof resultado?.affectedRows === 'number' && resultado.affectedRows > 0) {
      console.log(`${numero} — OK, ${resultado.affectedRows} linha(s) afetada(s).`);
    }
  });
  console.log('\nConcluído sem erros.\n');
} catch (erro) {
  sair(`ERRO (${erro.code ?? 'desconhecido'}): ${mascarar(erro.sqlMessage ?? erro.message)}\n`
    + 'Nada foi confirmado após o ponto do erro. Envie esta mensagem para análise antes de tentar de novo.');
} finally {
  await conexao?.end().catch(() => {});
}
