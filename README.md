# elosolidario
## Catálogo Angular no Railway

A demonstração anterior continua disponível com `node demo.mjs`. O catálogo Angular usa o MySQL e resolve a instituição pelo hostname cadastrado. Cada hostname corresponde a uma instituição aprovada. O catálogo é público e aceita intenções de doação.

1. Crie um projeto no Railway com um serviço MySQL e um serviço conectado ao repositório. Use a raiz do repositório para o build Docker.
2. No MySQL, aplique os arquivos V1 e V2 de backend/src/main/resources/db/migration, nessa ordem, uma vez por banco. Se V1 já foi aplicada, aplique somente V2.
3. No serviço da aplicação, adicione MYSQL_URL com a referência `${{MySQL.MYSQL_URL}}`. Ajuste MySQL para o nome do serviço de banco. O serviço escuta na variável PORT do Railway.
4. Gere um domínio do Railway para validar o catálogo. Cadastre o hostname exato da URL, sem https://, no registro da instituição aprovada. Cadastre uma campanha publicada e suas necessidades para o teste.
5. Para ativar um domínio próprio, adicione o hostname em Public Networking e copie os registros CNAME e TXT fornecidos pelo Railway ao provedor DNS. A sugestão de namespace é *.elo.vnbueno.com.br, com um hostname cadastrado por instituição. Na troca de domínio, atualize o hostname da instituição.
6. Abra o catálogo em dois endereços cadastrados e confira se cada um mostra somente as campanhas da instituição correspondente. O endpoint /health verifica a conexão e a migração V2.

O painel usa a variável ELO_PANEL_KEYS no Railway. O valor é um objeto JSON que mapeia o hostname de cada instituição para um código aleatório de 64 caracteres hexadecimais minúsculos. Use um código diferente por domínio. Trocar o código invalida as sessões daquele domínio. O painel também publica e encerra campanhas; novas campanhas deixam de depender de SQL. Teste com dados fictícios.

## Cadastro e administração de instituições (migração V3)

A migração V3 (db/migration/V3__acesso_instituicao.sql) adiciona à instituição o `codigo_hash` (hash do código do painel guardado no banco), `contato` e `criada_em`, e cria a tabela `responsavel`. Aplique V3 no MySQL **antes** de publicar a versão com essas mudanças — o catálogo passa a ler `codigo_hash`.

O código do painel passa a ser validado pelo hash no banco. Para compatibilidade, se a instituição ainda não tem `codigo_hash`, o sistema cai de volta na ELO_PANEL_KEYS, então as instituições já configuradas continuam logando com o mesmo código. A publicação invalida as sessões abertas (o esquema de assinatura do cookie muda); basta entrar de novo.

O cadastro público (`POST /api/cadastro`) cria uma instituição pendente com um responsável. A administração usa a variável ELO_ADMIN_KEY (um código aleatório de 64 caracteres hexadecimais minúsculos, igual às chaves de painel) e fica nas rotas `/api/admin/*`: lista todas as instituições, aprova (define o hostname, marca a aprovação e gera um código mostrado uma única vez) e regera o código. Gere uma chave com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. O hostname atribuído na aprovação só funciona depois de configurado em Railway + DNS.
