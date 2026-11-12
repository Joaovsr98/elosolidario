# Elo Brasil Solidário — Roadmap

_Atualizado em 12/11/2026. Stack mantido: Angular 20 + Node.js + MySQL + Railway._

Slogan: **Conectando quem quer ajudar a quem precisa.**

## No ar (MVP completo para a apresentação)

**Doadores e público**
- Catálogo por instituição (multi-tenant por domínio) com metas, **progresso** e intenção de doação sem login.
- **Explorar instituições**: busca pública por instituição ou campanha em toda a rede.
- Consentimento **LGPD** obrigatório (validado no servidor) e seção pública de **privacidade**.

**Instituições**
- Painel com **indicadores**, campanhas (rascunho, publicar, editar, encerrar), necessidades e metas.
- Intenções com **filtro**, confirmação de recebimento e **exportação CSV**.
- Gestão de **responsáveis**.
- Cadastro público com aprovação pela administração.

**Empresas que transformam**
- **Top 10 trimestral** (1 ponto por doação confirmada, reinício por trimestre, **histórico** dos últimos trimestres, sem valores).
- **Mural de Empresas Solidárias** com busca e **rotação diária** para dar visibilidade às menores.
- **Selos**: Primeiro Elo, Elo Constante, Elo em Ascensão, Destaque Solidário.

**Administração**
- Indicadores gerais, aprovação/recusa de cadastros, regerar código e **moderação** de campanhas.

**Qualidade**
- Segurança: CSP e cabeçalhos, sessões HMAC, CSRF por origem, consultas parametrizadas, **limite de tentativas** contra força bruta e spam.
- Desempenho: gzip, cache imutável e hash nos arquivos; skeletons de carregamento.
- Identidade visual azul-marinho + ciano, responsiva, com acessibilidade básica (foco visível, pular conteúdo, movimento reduzido).

## Próximas fases

### Fase A — Contas e busca (~3 semanas)
- Contas de **doador**: login, histórico e acompanhamento do status das contribuições.
- Contas/perfil de **empresa**: logotipo, descrição, localização, histórico privado e opção explícita de aparecer publicamente ou permanecer anônima.
- **Localização** (cidade/estado) e **categorias** com filtros — habilita também o selo **Elo Local**.

### Fase B — Reconhecimento e confiança (~2 semanas)
- Critérios de pontuação ampliados (frequência, campanhas apoiadas) e **antifraude** (pontuação duplicada, cancelamentos indevidos).
- **Denúncias** de campanhas e cadastros.

### Fase C — Governança e LGPD avançada (~2 semanas)
- **Trilha de auditoria** persistida em banco para operações administrativas.
- Exclusão e exportação de dados pelo próprio titular.
- Relatórios avançados por período e captcha no cadastro público.

## Estimativa

Para fechar toda a visão do documento a partir daqui: **~6 a 8 semanas** de desenvolvimento focado, mantendo o stack. Esse número não inclui o calendário do projeto de extensão (entrevistas, validações e coleta de evidências), que corre em paralelo.

## Pendências operacionais

- Limpar os dados de teste no banco (empresa e instituição "TESTE", campanha "TESTE - Campanha de brinquedos").
- Corrigir acentos em nomes inseridos por SQL (ex.: "Instituio Horizonte", "Esperanca", "Arrecadacao").
- Trocar a senha `root` do MySQL antes de usar dados reais.
- Acompanhar o crédito do plano trial do Railway para o serviço não sair do ar.
