# Operações manuais no banco (`ops/`)

Estes scripts **não são migrações**: cada um roda uma vez, à mão, pelo executor `ops/rodar-sql.mjs`, que conecta no MySQL do Railway. Não precisa instalar cliente MySQL nem Railway CLI. Faça num horário tranquilo — não no dia da apresentação.

**Regras do executor:** só roda arquivos desta pasta; scripts que alteram dados exigem `--confirmar`; o endereço do banco e as senhas ficam só em variáveis do terminal e nunca aparecem na tela. **Nunca cole o endereço do banco nem senhas no chat.**

---

## Preparação (a cada nova janela do PowerShell)

1. No Railway, abra o projeto **powerful-cat → serviço MySQL → Variables** e copie o valor de **`MYSQL_PUBLIC_URL`** (ícone de copiar). Se essa variável não existir, ative em **MySQL → Settings → Networking → TCP Proxy**.
2. Abra o PowerShell na pasta do projeto:
   ```powershell
   cd "C:\Users\vnpro\OneDrive\Desktop\00. Projetos\04. Elo Brasil Solidário\Elo cdx"
   ```
3. Guarde o endereço numa variável (vale só para esta janela):
   ```powershell
   $env:ELO_DB_URL = "cole-aqui-o-MYSQL_PUBLIC_URL"
   ```
4. Se a pasta `node_modules` não existir, rode `npm ci` uma vez.

---

## 01 — Limpar os dados de teste

Remove a empresa "Empresa Teste Ltda" (e a doação dela), a campanha "TESTE - Campanha de brinquedos" e a instituição "TESTE - Casa Solidária". Esperança e Horizonte continuam.

1. **Conferir** (só leitura):
   ```powershell
   node ops/rodar-sql.mjs ops/01a-limpeza-conferir.sql
   ```
   A primeira tabela deve ter **4 linhas**: a empresa, a instituição, a campanha e a intenção "Doador Empresa · 3". Se aparecer algo diferente, pare.
2. **Executar** (faz cópia de segurança em tabelas `bkp_elo_*` e apaga exatamente essas linhas):
   ```powershell
   node ops/rodar-sql.mjs ops/01b-limpeza-executar.sql --confirmar
   ```
   No fim aparece quantas linhas saíram de cada tabela, e a verificação "sobrou" deve vir vazia.
3. Confira o site: Top 10 e mural sem a empresa de teste, Explorar sem a Casa Solidária, e a campanha de agasalhos com **2 de 20** recebidos.
4. Se algo der errado, restaure:
   ```powershell
   node ops/rodar-sql.mjs ops/01c-limpeza-desfazer.sql --confirmar
   ```
5. Com tudo certo, apague as cópias de segurança (depois disso não dá para desfazer):
   ```powershell
   node ops/rodar-sql.mjs ops/01d-limpeza-finalizar.sql --confirmar
   ```

**Opcional** — remover também a doação "Pessoa Teste" e zerar a campanha de agasalhos (rode antes do passo 5):
```powershell
node ops/rodar-sql.mjs ops/01e-opcional-remover-pessoa-teste.sql --confirmar
```

> Dica para a banca: com o ranking vazio, registre uma doação de exemplo **ao vivo** informando uma empresa, confirme no painel e mostre ela entrando no Top 10.

---

## 02 — Corrigir os acentos

Corrige "Instituio Horizonte", "Esperanca" e as descrições "Arrecadao/Arrecadacao". Só altera essas quatro linhas e pode ser rodado de novo sem problema.

```powershell
node ops/rodar-sql.mjs ops/02-corrigir-acentos.sql --confirmar
```

Na tabela final, "ção" deve aparecer na coluna `hex` como `C3A7C3A36F`.

---

## 03 — Usuário da aplicação e senha do root

Hoje o site conecta como `root`, e a senha dele já apareceu num print. Vamos criar um usuário só para o site (com o mínimo de permissão) e depois trocar a senha do root. Nesta ordem, o site não sai do ar.

1. **Gere as duas senhas** direto em variáveis (nada fica salvo em arquivo):
   ```powershell
   $env:SENHA_DO_APP = node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
   ```powershell
   $env:NOVA_SENHA_ROOT = node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
   Para ver e guardar cada uma no seu gerenciador de senhas: `$env:SENHA_DO_APP` e `$env:NOVA_SENHA_ROOT`.
2. **Crie o usuário do site:**
   ```powershell
   node ops/rodar-sql.mjs ops/03a-criar-usuario-app.sql --confirmar
   ```
3. No Railway, abra o serviço **elosolidario → Variables → `MYSQL_URL`** e troque `${{MySQL.MYSQL_URL}}` por:
   ```
   mysql://elo_app:SENHA_DO_APP@${{MySQL.RAILWAY_PRIVATE_DOMAIN}}:3306/${{MySQL.MYSQLDATABASE}}
   ```
   substituindo `SENHA_DO_APP` pela senha do passo 1. Antes de salvar, confira na aba **Variables do serviço MySQL** se `RAILWAY_PRIVATE_DOMAIN` e `MYSQLDATABASE` existem com esses nomes (se o banco usar `MYSQL_DATABASE`, use esse).
4. Espere o deploy e confira `https://elo.vnbueno.com.br/health` (deve mostrar `{"ok":true}`), o site e o login do painel. **Se algo falhar**, volte o `MYSQL_URL` para `${{MySQL.MYSQL_URL}}` — o root ainda funciona neste momento.
5. **Troque a senha do root:**
   ```powershell
   node ops/rodar-sql.mjs ops/03b-trocar-senha-root.sql --confirmar
   ```
6. No Railway, abra o serviço **MySQL → Variables** e atualize `MYSQL_ROOT_PASSWORD` com a nova senha. O MySQL pode reiniciar por alguns segundos; o site se reconecta sozinho.
7. Confira o `/health` de novo. Para rodar outros scripts depois disso, copie de novo o `MYSQL_PUBLIC_URL` (ele muda junto com a senha).
