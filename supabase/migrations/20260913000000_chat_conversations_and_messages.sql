-- ==============================================================================
-- Migração: Tabelas de Histórico e Conversas do Agente IA (WhatsApp)
-- Aplicada pela CLI do Supabase (supabase db push) ou pelo SQL Editor do projeto
-- ==============================================================================

-- 1. Tabela de Conversas (1 linha por telefone)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT 'Cliente',
    paused BOOLEAN DEFAULT false,
    paused_at TIMESTAMPTZ,
    last_message TEXT,
    last_sender TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_phone ON public.chat_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON public.chat_conversations(updated_at DESC);

-- 2. Tabela de Mensagens Individuais (Histórico Contínuo)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    sender TEXT NOT NULL, -- 'client' | 'bot' | 'human'
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON public.chat_messages(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- 3. Habilitar Segurança por Linha (RLS)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_conversations' AND policyname = 'Allow public all chat_conversations'
  ) THEN
    CREATE POLICY "Allow public all chat_conversations" ON public.chat_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow public all chat_messages'
  ) THEN
    CREATE POLICY "Allow public all chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Habilitar Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
