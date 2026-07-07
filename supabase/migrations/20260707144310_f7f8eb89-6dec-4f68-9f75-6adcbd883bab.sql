create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_send_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  has_sub boolean;
begin
  select exists(select 1 from public.push_subscriptions where user_id = NEW.user_id) into has_sub;
  if not has_sub then
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://pqgidznijhsaboqqofhn.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2lkem5pamhzYWJvcXFvZmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNjQyMjMsImV4cCI6MjA4NDg0MDIyM30.W1wSuIYdwPRuxBdZrAW1xTbEQJedt66GC7FDOS5M3Fc'
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
$$;

drop trigger if exists on_notification_send_push on public.notifications;
create trigger on_notification_send_push
after insert on public.notifications
for each row execute function public.trigger_send_push();