# Integração n8n e Agente de IA

## Objetivo
Configurar o botão de Human Handover (Liga/Desliga do robô) e integrar os pedidos recebidos pela IA (Giovanna) diretamente no Gestor de Pedidos.

## Entradas e Componentes Envolvidos
- **Painel Front-End**: `AgentManager.tsx` (já atualizado para usar a tabela `settings`)
- **Banco de Dados (Supabase)**: Tabela `settings` (campo `bot_active`) e Tabela `orders`.
- **n8n Workflow**:
  - Nó de verificação `Verifica Bot Ativo` (consulta ao Supabase antes do nó do LangChain).
  - Nó de Tool `cadastrar_pedido_gestor` (POST na tabela `orders` via Supabase REST API).

## Passos de Execução
1. **Configuração Supabase**: Garantir que a tabela `settings` está acessível e as permissões RLS permitem a leitura pelo n8n.
2. **Atualização n8n (Verificação do Bot)**:
   - Inserir nó de consulta HTTP ou Postgres para ler `bot_active` na tabela `settings`.
   - Inserir nó IF para barrar a continuação do fluxo se `bot_active == false`.
3. **Atualização n8n (Tool de Pedido)**:
   - Adicionar HTTP Request Tool para enviar payload estruturado JSON do pedido para `https://yexlnjznkxthffklovql.supabase.co/rest/v1/orders`.
4. **Testes**:
   - Testar o liga/desliga bloqueando o fluxo no n8n.
   - Testar simulação de pedido e conferir se ele aparece na aba do gestor de pedidos.

## Ferramentas (Execution)
- Para testes diretos no Supabase, utilizar os scripts `test_select.js` e `test_order_insert.js` disponíveis na pasta `execution/`.

## Casos Extremos
- **Erro de CORS/Acesso**: Verifique as chaves no `.env` e as políticas RLS (`execution/fix_orders_insert_policy.sql` ou similar).
