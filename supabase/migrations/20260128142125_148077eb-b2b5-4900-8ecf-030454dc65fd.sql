-- Create admin_audit table for audit logging
CREATE TABLE public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view and create audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create audit logs"
  ON public.admin_audit FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND auth.uid() = admin_id);

-- Indexes for efficient querying
CREATE INDEX idx_admin_audit_admin_id ON public.admin_audit(admin_id);
CREATE INDEX idx_admin_audit_entity ON public.admin_audit(entity_type, entity_id);
CREATE INDEX idx_admin_audit_created_at ON public.admin_audit(created_at DESC);
CREATE INDEX idx_admin_audit_action ON public.admin_audit(action);