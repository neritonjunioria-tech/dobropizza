# Banco de dados — DOBRO Pizzas

Projeto Supabase: `dobropizza` (`yexlnjznkxthffklovql`).

## Estrutura
Toda a estrutura está em `migrations/`, aplicada em ordem pela CLI:

- `20260815020421_remote_schema.sql` — base: cardápio, pedidos, clientes, caixa,
  despesas, equipe/permissões, configurações e a pasta de imagens `cardapio-dobropizza`.
- as seguintes completam: movimentos de caixa, vínculo pedido/caixa, funil de vendas,
  conversas do agente de WhatsApp e motoboys.

## Aplicar uma alteração
1. Crie um arquivo novo em `migrations/` com data no nome (`AAAAMMDDHHMMSS_descricao.sql`).
2. Com `SUPABASE_ACCESS_TOKEN` definido (fica no `.env.local`, fora do Git):
   ```
   node ./node_modules/supabase/dist/supabase.js db push --dry-run
   node ./node_modules/supabase/dist/supabase.js db push
   ```
   Use `node ...supabase.js` em vez de `npx supabase`: o `&` no nome da pasta quebra o
   atalho no Windows.

## Usuários do gestor
O login em `/admin` aceita o nome curto (`admin`) e completa com `@dobropizza.com`.
Novos funcionários são criados na aba **Usuários**, que chama a função `manage-staff`.

## Netlify
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam estar em
**Site configuration → Environment variables** com os valores deste projeto.
