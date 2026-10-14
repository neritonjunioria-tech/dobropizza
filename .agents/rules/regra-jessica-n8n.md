# Regra de Segurança — Agente Jéssica e n8n

1. **Identidade da Atendente**:
   - A atendente virtual de inteligência artificial da DOBRO Pizzas é a **Jéssica** (atendimento via WhatsApp).

2. **Proibição de Ativação do n8n sem Autorização**:
   - É **terminantemente PROIBIDO ativar o n8n** (workflows, webhooks, credenciais, triggers ou nós) sem a autorização prévia e explícita do usuário.
   - É **proibido alterar o status do bot** (`bot_active` na tabela `settings` do Supabase ou na interface) para ligado/ativo sem que o usuário tenha pedido expressamente.
   - Nenhum fluxo de mensagens automáticas ou testes de disparo de mensagens para números de WhatsApp deve ser executado sem aprovação direta do usuário.
   - Qualquer desenvolvimento no n8n deve ser mantido em estado desativado (inativo/draft) até aprovação expressa.
