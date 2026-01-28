import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AuditAction =
  | "submission_approved"
  | "submission_rejected"
  | "submission_edited"
  | "listing_published"
  | "listing_status_changed"
  | "listing_featured_toggled"
  | "listing_deleted"
  | "seller_verified"
  | "seller_unverified"
  | "seller_trust_adjusted"
  | "seller_banned"
  | "seller_warned"
  | "report_reviewed"
  | "report_closed";

export type EntityType =
  | "submission"
  | "listing"
  | "seller"
  | "report";

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  details?: Record<string, unknown>;
}

export function useAdminAudit() {
  const { user } = useAuth();

  const logAction = async ({ action, entityType, entityId, details }: AuditLogParams) => {
    if (!user) return;

    try {
      // Use type assertion since admin_audit table was just created
      const { error } = await supabase.from("admin_audit" as never).insert({
        admin_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details || null,
      } as never);

      if (error) {
        console.error("Failed to log audit action:", error);
      }
    } catch (err) {
      console.error("Audit log error:", err);
    }
  };

  return { logAction };
}
