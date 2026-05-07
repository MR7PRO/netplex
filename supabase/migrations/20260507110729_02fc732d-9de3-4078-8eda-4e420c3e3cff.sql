
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  listing_id uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, seller_id, listing_id)
);

CREATE INDEX idx_conv_buyer ON public.conversations(buyer_id, last_message_at DESC);
CREATE INDEX idx_conv_seller ON public.conversations(seller_id, last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own conversations" ON public.conversations
FOR SELECT USING (
  auth.uid() = buyer_id
  OR seller_id = public.get_seller_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Buyers create conversations" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants update conversations" ON public.conversations
FOR UPDATE USING (
  auth.uid() = buyer_id
  OR seller_id = public.get_seller_id(auth.uid())
);

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_conv ON public.messages(conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid()
           OR c.seller_id = public.get_seller_id(auth.uid())
           OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Participants send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid()
           OR c.seller_id = public.get_seller_id(auth.uid()))
  )
);

CREATE POLICY "Mark messages read" ON public.messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = public.get_seller_id(auth.uid()))
  )
);

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Trigger: bump last_message_at and notify recipient
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_seller_user uuid;
  v_recipient uuid;
  v_sender_name text;
BEGIN
  SELECT c.buyer_id, s.user_id
    INTO v_buyer, v_seller_user
  FROM public.conversations c
  JOIN public.sellers s ON s.id = c.seller_id
  WHERE c.id = NEW.conversation_id;

  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  v_recipient := CASE WHEN NEW.sender_id = v_buyer THEN v_seller_user ELSE v_buyer END;

  IF v_recipient IS NOT NULL AND v_recipient <> NEW.sender_id THEN
    SELECT name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_recipient,
      'new_message',
      'رسالة جديدة من ' || COALESCE(v_sender_name, 'مستخدم'),
      LEFT(NEW.body, 100),
      '/messages/' || NEW.conversation_id,
      jsonb_build_object('conversation_id', NEW.conversation_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
