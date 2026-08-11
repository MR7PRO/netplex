CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
declare
  has_sub boolean;
  v_secret text;
begin
  select exists(select 1 from public.push_subscriptions where user_id = NEW.user_id) into has_sub;
  if not has_sub then
    return NEW;
  end if;

  select value into v_secret from public.internal_config where key = 'push_internal_secret';
  if v_secret is null then
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://pqgidznijhsaboqqofhn.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'url', COALESCE(NEW.link, '/'),
      'tag', NEW.type,
      'notification_id', NEW.id
    )
  );
  return NEW;
exception when others then
  return NEW;
end;
$function$;

REVOKE ALL ON FUNCTION public.trigger_send_push() FROM PUBLIC, anon, authenticated;