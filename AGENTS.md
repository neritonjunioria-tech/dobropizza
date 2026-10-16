# DOBRO Pizzas — regras para agentes de IA

Esta pasta é o projeto **DOBRO Pizzas** (cardápio digital, gestor /admin e brandbook).
Ela começou como cópia do projeto de outro cliente (41 Menus), mas **não tem mais nenhuma ligação com ele**.

## Destinos permitidos (os únicos)

| Serviço | Destino da DOBRO |
|---|---|
| GitHub | `neritonjunioria-tech/dobropizza` (remote `origin`) |
| Netlify | conta Pro **reservaconsultorias@gmail.com** (`https://dobropizzasdelivery.netlify.app`) |
| Supabase | projeto `dobropizza`, ref `yexlnjznkxthffklovql` |


## Proibido

- Publicar, enviar ou alterar qualquer coisa do **41 Menus** ou de outro projeto:
  - repositório `reservaconsultorias-beep/cardapionovosistema`;
  - Supabase `tipnhvpivhaerumetona`;
  - Qualquer outro site dentro da conta Netlify que não seja especificamente o site oficial da DOBRO (`dobropizzasdelivery`).
- Rodar `netlify deploy`, `netlify link` ou `netlify init` a partir deste computador sem antes conferir com `netlify status` que a conta e o site alvo são especificamente o da DOBRO (`dobropizzasdelivery.netlify.app`).
- Adicionar remotes de Git de outros projetos ou fazer push para qualquer remote que não seja `origin`.
- Copiar pastas `.git` ou `.netlify` de outros projetos para cá.
- **Ativar ou ligar o n8n** (workflows, webhooks ou o status `bot_active`) do agente de IA **Jéssica** sem a autorização prévia e explícita do usuário.

## Agente de IA (Jéssica) e Automação n8n

1. **Identidade**: A atendente virtual de IA da DOBRO Pizzas chama-se **Jéssica**.
2. **Trava de Segurança n8n**: É terminantemente proibido ativar o n8n, publicar ou habilitar workflows da Jéssica, disparar mensagens em massa ou alternar `bot_active` sem comando e consentimento explícito do usuário.
3. Todo e qualquer fluxo de n8n deve permanecer desligado/desativado por padrão até ordem expressa do usuário.

## Como publicar (Regra Estrita de Autorização)

1. **Deploy / Git Push Travado por Padrão**: O agente está proibido de rodar `git push origin main` ou qualquer comando de deploy de forma automática.
2. **Fluxo Obrigatório**:
   - Desenvolver e aplicar alterações no código local.
   - Validar com `npm run build` localmente.
   - Apresentar o resumo das alterações ao usuário.
   - **Aguardar a autorização expressa do usuário** (ex: "pode fazer o deploy", "autorizado", "pode subir") antes de executar qualquer `git push`.
3. O caminho de deploy é exclusivamente o push para o GitHub da DOBRO (`origin`), que dispara o build na Netlify da conta Pro `reservaconsultorias@gmail.com`.
4. Antes de qualquer deploy, confirme e informe ao usuário: conta Netlify, nome do site, remote do Git e ref do Supabase. Se qualquer um não for da DOBRO, **pare e avise**.

## Conteúdo

- Nomes e descrições de produtos: use exatamente o texto que o usuário enviar, sem corrigir nem reescrever.
- Moeda: real brasileiro (R$). A loja fica em São José dos Pinhais — PR, Brasil.

