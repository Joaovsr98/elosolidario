# Elo Brasil Solidário

**Conectando quem quer ajudar a quem precisa.**

Plataforma que conecta pessoas e empresas a instituições sociais que arrecadam bens materiais. Projeto Integrador de Análise e Desenvolvimento de Sistemas — UNASP · InovaTec 2026/2.

- Instituto Esperança (teste): https://elo.vnbueno.com.br
- Instituição Horizonte (teste): https://elosolidario-production.up.railway.app

## Funcionalidades

**Para quem doa (sem login)**
- Campanhas da instituição com necessidades, metas e **barra de progresso** (recebido × meta).
- Registro da **intenção de doar** (nome, contato, quantidade e, opcionalmente, a empresa que representa), com **consentimento LGPD** obrigatório.
- **Explorar instituições**: busca pública por instituição ou campanha em toda a rede.
- **Empresas que transformam**: Top 10 trimestral (com histórico dos últimos trimestres), **Mural de Empresas Solidárias** com busca e ordem que muda diariamente, e **selos** (Primeiro Elo, Elo Constante, Elo em Ascensão, Destaque Solidário). Valores e quantidades nunca são expostos.
- Seção de **Privacidade (LGPD)** explicando dados coletados, finalidade, quem vê, retenção e direitos.

**Para a instituição (painel com código de acesso)**
- Indicadores (campanhas ativas, doações pendentes e recebidas).
- Criar campanhas com itens e metas, **salvar como rascunho**, **publicar**, **editar** e **encerrar**.
- Lista de intenções com **filtro** (pendentes/recebidas), **confirmação de recebimento** e **exportação CSV**.
- Cadastro e remoção de **responsáveis**.

**Para a administração (chave de administrador)**
- Indicadores gerais da rede.
- Análise de cadastros: **aprovar** (define o domínio e gera o código, mostrado uma única vez), **recusar** cadastros pendentes e **regerar código**.
- **Moderação**: encerrar campanhas abertas de qualquer instituição.

## Arquitetura

- **Frontend**: Angular 20 (standalone, zoneless, signals) em `frontend/main.ts`.
- **Backend**: Node.js sem framework — `server.mjs` (roteamento, estáticos, segurança), `doacoes.mjs` (doações e painel), `instituicoes.mjs` (cadastro, explorar e administração), `empresas.mjs` (ranking e mural).
- **Banco**: MySQL 8, migrações em `backend/src/main/resources/db/migration/`.
- **Infra**: Docker no Railway; o mesmo serviço entrega a aplicação Angular e a API. `PORT` padrão 8080; `GET /health` verifica o banco.
- **Multi-tenant por domínio**: cada instituição aprovada tem um `hostname` único. A API identifica a instituição pelo domínio da requisição e filtra todas as consultas por ela no servidor — o frontend nunca escolhe o ID da instituição.

`demo.mjs` é a demonstração anterior (HTML + SQLite), mantida apenas como referência.

## Configuração e deploy (Railway)

1. Projeto no Railway com um serviço **MySQL** e um serviço conectado a este repositório (build Docker pela raiz). Um push na `main` publica automaticamente.
2. **Migrações**: aplique V1, V2, V3 e V4, nessa ordem, uma vez por banco. **Aplique cada migração antes de publicar o código que depende dela** — senão as consultas falham.
3. Variáveis do serviço da aplicação:
   - `MYSQL_URL` = `${{MySQL.MYSQL_URL}}`
   - `ELO_ADMIN_KEY` = 64 caracteres hexadecimais minúsculos (sem espaços)
   - `ELO_PANEL_KEYS` (legado) = JSON `{ "hostname": "código" }`, usado só por instituições que ainda não têm `codigo_hash` no banco
   - Gere chaves com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Domínio próprio**: adicione o hostname em *Public Networking* e copie os registros CNAME e TXT para o DNS (Registro.br). O hostname de uma instituição aprovada só funciona depois disso.
5. **Ao criar um novo módulo `.mjs`**, inclua-o na linha `COPY` do `Dockerfile` — a imagem final copia apenas os arquivos listados.

> Redes com inspeção de HTTPS (comuns em escolas e empresas) podem exibir `ERR_CERT_AUTHORITY_INVALID` mesmo com o certificado correto. Para apresentações, use uma rede sem esse filtro (ex.: 4G).

## API

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | público | saúde do serviço e do banco |
| GET | `/api/campanhas` | público (por domínio) | campanhas abertas da instituição, com progresso |
| POST | `/api/doacoes` | público (por domínio) | registra intenção de doação (exige consentimento) |
| GET | `/api/explorar?q=` | público | instituições e campanhas abertas da rede |
| GET | `/api/ranking?ano=&tri=` | público | Top 10 do trimestre (atual por padrão) |
| GET | `/api/empresas?q=` | público | mural de empresas com selos |
| POST | `/api/cadastro` | público | cadastro de instituição pendente (exige consentimento) |
| POST | `/api/painel/entrar` · `/sair` | instituição | sessão do painel |
| GET | `/api/painel/doacoes` · `/campanhas` · `/responsaveis` | instituição | dados do painel |
| POST | `/api/painel/receber` | instituição | confirma recebimento |
| POST | `/api/painel/campanhas` · `/publicar` · `/editar` · `/encerrar` | instituição | gestão de campanhas |
| POST | `/api/painel/responsaveis` · `/remover` | instituição | gestão de responsáveis |
| POST | `/api/admin/entrar` · `/sair` | admin | sessão de administração |
| GET | `/api/admin/instituicoes` · `/indicadores` · `/campanhas` | admin | visão geral |
| POST | `/api/admin/aprovar` · `/recusar` · `/codigo` · `/campanhas/encerrar` | admin | análise e moderação |

## Segurança e privacidade

- Autorização sempre no servidor; isolamento por instituição derivado do domínio, nunca do payload.
- Códigos de painel guardados como **hash** (SHA-256); sessões por cookie **HMAC** `HttpOnly`, `Secure`, `SameSite=Strict`, com expiração.
- Requisições POST exigem `Origin` do próprio site e `Content-Type: application/json` (proteção contra CSRF).
- Consultas **parametrizadas**; exportação CSV protegida contra injeção de fórmulas.
- Cabeçalhos: **CSP**, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
- **Limite de tentativas** por IP: login do painel e do admin (10 a cada 15 min), cadastro (5/h), doações (20/h).
- **LGPD**: consentimento validado no servidor, coleta mínima, política de privacidade pública, nome/contato visíveis só para a instituição que recebe a doação.
- Desempenho: estáticos com **hash no nome**, **gzip** e cache imutável; `index.html` sempre revalidado.

## Desenvolvimento

```bash
npm ci
npm run build
```

```bash
MYSQL_URL="mysql://usuario:senha@host:3306/banco" npm start
```

Veja o [ROADMAP](ROADMAP.md) para o status e as próximas fases.
