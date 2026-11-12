# Operações manuais no banco (`ops/`)

Estes scripts **não são migrações**: rode cada um uma única vez, à mão, pelo mesmo terminal ou console que você usou para aplicar a V3 e a V4. Faça num horário tranquilo — não no dia da apresentação.

Se usar o cliente `mysql` pela linha de comando, inclua `--default-character-set=utf8mb4`.

Ordem sugerida: **01 → 02 → 03**.

---

## 01 — Limpar os dados de teste (`01-limpeza-dados-teste.sql`)

Remove a empresa "Empresa Teste Ltda" (e a doação dela), a campanha "TESTE - Campanha de brinquedos" e a instituição "TESTE - Casa Solidária". Esperança e Horizonte continuam.

1. Rode a **PARTE 1** (só leitura). Deve listar: 1 empresa, 1 instituição, 1 campanha e 1 intenção ("Doador Empresa · 3"). Se aparecer algo diferente, pare e me avise.
2. Rode a **PARTE 2** (cópia de segurança) e a **PARTE 3** (remoção). A conferência final deve voltar vazia.
3. Abra o site e confira: Top 10 e mural sem a empresa de teste, Explorar sem a Casa Solidária, e a campanha de agasalhos com **2 de 20** recebidos.
4. Se algo der errado, rode a seção **DESFAZER**. Quando estiver tudo certo, rode a seção **FINAL** para apagar as cópias.

A seção **OPCIONAL** remove também a doação "Pessoa Teste" e zera a campanha de agasalhos.

> Dica para a banca: com o ranking vazio, registre uma doação de exemplo **ao vivo** informando uma empresa, confirme no painel e mostre ela entrando no Top 10. Isso demonstra o fluxo completo.

---

## 02 — Corrigir os acentos (`02-corrigir-acentos.sql`)

Corrige "Instituio Horizonte", "Esperanca" e as descrições "Arrecadao/Arrecadacao". Pode rodar o arquivo inteiro de uma vez; ele não altera nada além dessas quatro linhas.

Na conferência do final, "ção" deve aparecer na coluna `hex` como `C3A7C3A36F`. Se o texto aparecer estranho só no console, mas o hex estiver certo, está tudo certo — é apenas a exibição do console.

---

## 03 — Usuário da aplicação e senha do root (`03-usuario-app-e-senha-root.sql`)

Hoje a aplicação conecta como `root`, e a senha dele já apareceu em um print. Vamos criar um usuário só para o app (com privilégios mínimos) e trocar a senha do root. Seguindo esta ordem, o site não sai do ar.

1. **Gere duas senhas** no seu computador (uma para o app, outra para o root). Guarde-as num gerenciador de senhas e **não cole no chat**:
   ```
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
2. No MySQL, rode a **PARTE 1** do script, trocando `SENHA_DO_APP` pela primeira senha. Se `banco_atual` não for `railway`, ajuste o nome na linha do `GRANT`.
3. No Railway, abra o serviço **elosolidario → Variables → `MYSQL_URL`** e troque o valor `${{MySQL.MYSQL_URL}}` por:
   ```
   mysql://elo_app:SENHA_DO_APP@${{MySQL.RAILWAY_PRIVATE_DOMAIN}}:3306/${{MySQL.MYSQLDATABASE}}
   ```
   Antes de salvar, confira na aba **Variables do serviço MySQL** se `RAILWAY_PRIVATE_DOMAIN` e `MYSQLDATABASE` existem com esses nomes. Se o banco tiver outro nome de variável (ex.: `MYSQL_DATABASE`), use o que aparece lá.
4. Espere o deploy e confira:
   - `https://elo.vnbueno.com.br/health` → `{"ok":true}`
   - o site abre normalmente e o painel aceita o login.

   **Se algo falhar**, volte o `MYSQL_URL` para `${{MySQL.MYSQL_URL}}` (o root ainda funciona nesse momento) e me chame.
5. No MySQL, rode a **PARTE 2** do script, trocando `NOVA_SENHA_ROOT` pela segunda senha.
6. No Railway, abra o serviço **MySQL → Variables** e atualize `MYSQL_ROOT_PASSWORD` com a nova senha do root. Assim o console do Railway continua conectando. O MySQL pode reiniciar por alguns segundos; o site se reconecta sozinho.
7. Confira o `/health` mais uma vez.
