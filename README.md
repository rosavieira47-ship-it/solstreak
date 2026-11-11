# Solstreak ☀️

Primeira versão do Solstreak: cadastro por nickname, check-in diário, ofensiva, calendário pessoal e ranking público.

## O que já está implementado

- Entrada com nickname (sem nome completo ou e-mail).
- Autenticação anônima do Supabase, com sessão persistida no navegador.
- Um registro por pessoa por dia (restrição também no banco).
- Ofensiva atual e total de dias registrados.
- Calendário mensal individual.
- Ranking público por ofensiva.
- Interface responsiva, em português, com identidade solar em amarelo, laranja e creme.

> O registro é uma autodeclaração. O app não verifica aplicação nem reaplicação do protetor solar. O registro diário é um incentivo de hábito, não uma orientação médica.

## 1. Criar o banco gratuito

1. Acesse https://supabase.com e crie uma conta/projeto.
2. No painel do projeto, abra **SQL Editor**.
3. Abra `supabase/schema.sql`, copie todo o conteúdo e execute.
4. Vá a **Authentication → Sign In / Providers** e habilite **Anonymous Sign-Ins**.
5. Em **Project Settings → API**, copie:
   - Project URL
   - Project API keys → `anon` / publishable key

O projeto usa autenticação anônima. Cada navegador recebe uma sessão persistente. Como não há e-mail/senha, se a pessoa limpar os dados do navegador ou trocar de dispositivo, poderá perder o acesso ao perfil antigo. Para uma versão posterior, podemos adicionar login com e-mail ou código de recuperação.

## 2. Rodar no computador

Instale Node.js (versão LTS), abra a pasta do projeto no terminal e rode:

```bash
npm install
```

Crie um arquivo `.env` na raiz, copiando `.env.example`, e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
```

Depois execute:

```bash
npm run dev
```

O terminal mostrará um endereço local, normalmente http://localhost:5173.

## 3. Publicar e gerar o link

1. Crie uma conta em https://github.com e um repositório novo chamado `solstreak`.
2. Envie todos os arquivos desta pasta para o repositório.
3. Crie uma conta em https://vercel.com e escolha **Add New → Project**.
4. Importe o repositório `solstreak`.
5. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Clique em **Deploy**.

A Vercel fornecerá um endereço público, por exemplo `solstreak.vercel.app` (o nome pode variar conforme disponibilidade). Compartilhe esse link com as pessoas.

## Segurança e privacidade

- A chave `anon`/publishable pode ficar no navegador; nunca use a chave `service_role` no site.
- As políticas RLS limitam a criação de registros ao próprio usuário autenticado.
- Nicknames, perfis e datas de check-in são públicos por escolha do produto.
- Para evitar exposição desnecessária, não peça nome completo, localização ou informações de saúde.
- Antes de abrir ao público em maior escala, vale adicionar proteção contra abuso, fluxo de recuperação de conta e termos/aviso de privacidade.

## Regras da ofensiva

A sequência conta registros em dias consecutivos. Se a pessoa ainda não registrou hoje, a contagem considera a sequência até ontem. O histórico acumulado nunca é apagado quando a sequência é interrompida.
