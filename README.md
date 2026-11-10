# elosolidario
## Catálogo Angular no Railway

A demonstração anterior continua disponível com `node demo.mjs`. O catálogo Angular usa o MySQL e resolve a instituição pelo hostname cadastrado. Cada hostname corresponde a uma instituição aprovada. O catálogo atual é público e somente leitura.

1. Crie um projeto no Railway com um serviço MySQL e um serviço conectado ao repositório. Use a raiz do repositório para o build Docker.
2. No MySQL, aplique os arquivos V1 e V2 de backend/src/main/resources/db/migration, nessa ordem, uma vez por banco. Se V1 já foi aplicada, aplique somente V2.
3. No serviço da aplicação, adicione MYSQL_URL com a referência `${{MySQL.MYSQL_URL}}`. Ajuste MySQL para o nome do serviço de banco. O serviço escuta na variável PORT do Railway.
4. Gere um domínio do Railway para validar o catálogo. Cadastre o hostname exato da URL, sem https://, no registro da instituição aprovada. Cadastre uma campanha publicada e suas necessidades para o teste.
5. Para ativar um domínio próprio, adicione o hostname em Public Networking e copie os registros CNAME e TXT fornecidos pelo Railway ao provedor DNS. A sugestão de namespace é *.elo.vnbueno.com.br, com um hostname cadastrado por instituição. Na troca de domínio, atualize o hostname da instituição.
6. Abra o catálogo em dois endereços cadastrados e confira se cada um mostra somente as campanhas da instituição correspondente. O endpoint /health verifica a conexão e a migração V2.

A área autenticada, o registro de doações e a confirmação de recebimento ainda precisam ser migrados da demonstração. Use dados fictícios nesta fase.
