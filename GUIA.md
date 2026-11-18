# Byun: passo a passo para colocar no ar

Tempo: uns 20 minutos. Tudo no plano grátis. Faça na ordem.

Contas que vão existir:

| Usuário | Senha inicial | Mascote |
|---|---|---|
| Layla | Fin#2026 | gato preto de olhos verdes |
| Bianca | Fin#2026 | onça roxa |
| admin | Fin#2026 | (painel de administração) |

No primeiro acesso, o app obriga cada pessoa a criar uma senha nova.

---

## 1. Criar o projeto no Supabase

1. Entre em https://supabase.com e crie uma conta.
2. Clique em **New project**. Região: **South America (São Paulo)**.
   Crie uma senha forte para o banco e guarde (não é a senha do app).
3. Espere o projeto terminar de criar (1 ou 2 minutos).

## 2. Criar a estrutura do banco

1. No menu da esquerda: **SQL Editor > New query**.
2. Abra o arquivo `supabase/schema.sql`, copie **tudo**, cole e clique em **Run**.
3. No resultado aparecem os 3 usuários liberados: admin, bianca, layla.

## 3. Travar o login

Em **Authentication > Sign In / Providers** (os nomes podem mudar um pouco):

- **Allow new users to sign up**: **desligado**. Assim só você cria contas.
- **Email**: ligado. **Confirm email** pode ficar desligado (as contas são criadas por você).
- Senha: tamanho mínimo **8**.
- Deixe desligados os outros provedores (Google, GitHub...).

## 4. Criar as 3 contas

Vá em **Authentication > Users > Add user > Create new user**. Faça três vezes:

| Email | Password | Auto Confirm User |
|---|---|---|
| `SEUEMAIL+layla@gmail.com` | `Fin#2026` | marcado |
| `SEUEMAIL+bianca@gmail.com` | `Fin#2026` | marcado |
| `SEUEMAIL+admin@gmail.com` | `Fin#2026` | marcado |

Troque `SEUEMAIL` pelo seu Gmail de verdade (ex.: se seu e-mail é `lay.silva@gmail.com`,
use `lay.silva+layla@gmail.com`). Esses endereços só existem porque o Supabase exige um
e-mail. Ninguém recebe nada neles, e no app vocês digitam só **Layla**, **Bianca** ou **admin**.

Se aparecer "Database error creating new user", é porque o nome depois do `+` não está
liberado. Confira se escreveu `layla`, `bianca` ou `admin` certinho.

## 5. Ligar o app ao banco

1. Em **Project Settings > API** (ou **API Keys**), copie a **Project URL** e a chave
   **anon / publishable**.
2. Abra o arquivo `config.js` e preencha:
   - `SUPABASE_URL`: a Project URL
   - `SUPABASE_ANON_KEY`: a chave anon / publishable
   - `EMAIL_BASE`: o mesmo Gmail do passo 4 (ex.: `lay.silva@gmail.com`)
3. **Nunca** coloque a chave `service_role` / `secret` no app.

## 6. Publicar no GitHub Pages

1. No GitHub, crie um repositório (ex.: `byun`) e envie todos os arquivos desta pasta.
2. **Settings > Pages > Deploy from a branch > main / (root) > Save**.
3. Em 1 ou 2 minutos o app fica em `https://lay127.github.io/byun/`.
4. No Supabase, em **Authentication > URL Configuration**, coloque esse endereço em
   *Site URL*.

## 7. Primeiro acesso

1. Abra o link no celular.
2. Entre com **admin** / **Fin#2026**, crie a senha nova da conta admin e saia.
3. Entre com **Layla** / **Fin#2026** e crie a sua senha. Quando o celular perguntar se
   quer salvar a senha, toque em **Salvar**. Assim ela fica no gerenciador de senhas
   (Chaves do iCloud ou Google).
4. Instale: no iPhone, **Safari > Compartilhar > Adicionar à Tela de Início**.
   No Android, **Chrome > três pontinhos > Instalar app**.
5. Mande o link para a Bianca com o usuário **Bianca** e a senha **Fin#2026**.
   Ela troca a senha no primeiro acesso.

---

## O que a conta admin faz

- Vê quem já entrou e quem ainda precisa criar a senha.
- **Redefinir senha**: coloca uma senha temporária. A pessoa sai de todos os aparelhos e
  é obrigada a criar outra quando entrar.
- **Editar mascote** de qualquer pessoa.
- **Liberar nova pessoa**: depois é só criar a conta no Supabase (passo 4) com o nome liberado.
- A conta admin **não vê os gastos de ninguém**.

## Personalizar o mascote

Cada pessoa pode mudar o próprio mascote em **Ajustes > Seu mascote**: nome, bichinho (gato,
onça, coelho ou urso), cor do corpo, cor dos olhos, cor do app, lacinho e bochechas.

## O que protege os dados

- Cada pessoa só lê e altera os próprios dados. Quem bloqueia isso é o banco, e eu testei.
- Só quem está liberado pode ter conta, mesmo se alguém tentar criar pela API.
- Ninguém muda o próprio usuário nem vira admin por conta própria.
- Senha inicial obrigatória de trocar, com no mínimo 8 caracteres, letras e números.
- Tudo em HTTPS. O app bloqueia scripts de fora (a biblioteca do Supabase vai junto em `vendor/`).
- Cada pessoa pode excluir a própria conta e todos os dados em Ajustes.

## Bom saber

- **Projeto pausado**: no plano grátis, o Supabase pausa projetos sem uso por cerca de uma
  semana. É só entrar no painel e reativar. Os dados não somem.
- **Offline**: o app funciona sem internet e sincroniza quando a conexão volta.
- **Atualizar o app**: ao mudar o código, troque `byun-v19` em `sw.js` (ex.: `byun-v20`).
