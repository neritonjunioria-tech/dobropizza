# DOBRO Pizzas — regras para agentes de IA

Esta pasta é o projeto **DOBRO Pizzas** (cardápio digital, gestor /admin e brandbook).
Ela começou como cópia do projeto de outro cliente (41 Menus), mas **não tem mais nenhuma ligação com ele**.

## Destinos permitidos (os únicos)

| Serviço | Destino da DOBRO |
|---|---|
| GitHub | `neritonjunioria-tech/dobropizza` (remote `origin`) |
| Netlify | conta **neritonjunioria@gmail.com** (`https://dobropizzasdelivery.netlify.app`) |
| Supabase | projeto `dobropizza`, ref `yexlnjznkxthffklovql` |


## Proibido

- Publicar, enviar ou alterar qualquer coisa do **41 Menus** ou de outro cliente:
  - conta Netlify `reservaconsultorias@gmail.com`;
  - repositório `reservaconsultorias-beep/cardapionovosistema`;
  - Supabase `tipnhvpivhaerumetona`.
- Rodar `netlify deploy`, `netlify link` ou `netlify init` a partir deste computador sem antes conferir com `netlify status` que a conta logada é **neritonjunioria@gmail.com** e que o site é o da DOBRO. O Netlify CLI deste PC pode estar logado na conta de outro cliente.
- Adicionar remotes de Git de outros projetos ou fazer push para qualquer remote que não seja `origin`.
- Copiar pastas `.git` ou `.netlify` de outros projetos para cá.

## Como publicar

1. O caminho padrão é fazer push para o GitHub da DOBRO (`origin`). O Netlify da conta neritonjunioria publica sozinho a partir desse repositório.
2. Só publique quando o usuário pedir explicitamente.
3. Antes de qualquer deploy, confirme e informe ao usuário: conta Netlify, nome do site, remote do Git e ref do Supabase. Se qualquer um não for da DOBRO, **pare e avise**.

## Conteúdo

- Nomes e descrições de produtos: use exatamente o texto que o usuário enviar, sem corrigir nem reescrever.
- Moeda: real brasileiro (R$). A loja fica em São José dos Pinhais — PR, Brasil.
