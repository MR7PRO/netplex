
-- Create admin_invites table
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'sub_admin',
  created_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_by uuid,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invites
CREATE POLICY "Admins can manage invites"
  ON public.admin_invites FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Anyone can read a specific invite by code (for validation during signup)
CREATE POLICY "Anyone can validate invite codes"
  ON public.admin_invites FOR SELECT
  TO anon, authenticated
  USING (true);
