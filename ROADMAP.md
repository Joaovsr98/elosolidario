# Elo Brasil Solidário — Roadmap

_Status em 10/11/2026. Stack mantido: Angular 20 + Node.js + MySQL + Railway (sem migração para Java/Vercel/Render)._

Slogan: **Conectando quem quer ajudar a quem precisa.**

## No ar hoje (MVP funcional e publicado)

- **Multi-tenant por domínio**: cada instituição responde por um hostname próprio; a API resolve e isola os dados por instituição no servidor.
- **Doação sem login**: a pessoa vê as campanhas e registra a intenção (nome, contato, quantidade). Opcionalmente informa a empresa que representa.
- **Painel da instituição** (acesso por código): publica, edita, salva como rascunho e encerra campanhas; cadastra necessidades e metas; acompanha intenções e **confirma o recebimento**.
- **Progresso da campanha**: barra de recebido × meta por item.
- **Cadastro e aprovação de instituições**: formulário público cria instituição pendente + responsável; administração aprova, define o domínio e gera o código de acesso.
- **Empresas que transformam**:
  - **Top 10 trimestral** (1 ponto por doação confirmada, ciclos por trimestre, reinício automático, histórico de dados preservado, **sem expor valores ou quantidades**).
  - **Diretório público com busca** por nome.
  - **Selos de reconhecimento** (Primeiro Elo, Elo Constante, Elo em Ascensão, Destaque Solidário).
- **Indicadores** no topo (campanhas, itens, empresas).
- **Identidade visual** (tema azul-marinho + ciano, hero com arte própria), **favicon/meta/SEO**, título dinâmico e acessibilidade básica (foco visível, movimento reduzido).

## Próximas fases

### Fase A — Contas e busca (~3–4 semanas)
- Contas de **doador**: login, histórico pessoal e acompanhamento do status das contribuições.
- Contas/perfil de **empresa**: logotipo, descrição, localização, histórico privado e opção de aparecer publicamente ou permanecer anônima.
- **Localização** (cidade/estado) e **categorias/setores**, com filtros na busca de instituições, campanhas e empresas.

### Fase B — Reconhecimento (~2–3 semanas)
- **Mural de Empresas Solidárias** com autorização (opt-in) e rotação para dar visibilidade a pequenas e novas participantes.
- **Histórico de rankings** por trimestre (tela de edições anteriores).
- Critérios de pontuação ampliados (frequência, campanhas apoiadas) e **proteção antifraude** (sem pontuação duplicada ou cancelamentos indevidos).

### Fase C — Governança (~3–4 semanas)
- **Moderação** de campanhas e cadastros, controle de **denúncias**, aprovação de campanhas.
- **Relatórios** da instituição e indicadores gerais da administração.
- **LGPD**: consentimento, política de privacidade, direitos do titular e **trilha de auditoria** das operações importantes.
- **Antispam/captcha** no cadastro público.

## Estimativa

Para completar toda a visão do projeto, mantendo o stack atual e no ritmo de desenvolvimento assistido: **~8 a 11 semanas de trabalho focado**. O item mais pesado é a Fase A (autenticação). Esse número é tempo de desenvolvimento; o calendário do projeto de extensão inclui, em paralelo, as interações com o público (entrevistas, validação e coleta de evidências por bloco).

## Nota de prazo

Para a entrega de **16/11/2026**, a meta é um **MVP demo-ready** — já no ar e apresentável — com as fases acima registradas como evolução planejada. Tentar emendar os módulos maiores (contas, LGPD, moderação) nesse prazo traria funcionalidades incompletas e risco na apresentação.
