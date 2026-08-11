import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authenticate the caller: the acting user comes ONLY from the JWT.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "غير مصرح" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsError || !userId) {
      return json({ error: "غير مصرح" }, 401);
    }

    const body = await req.json().catch(() => null);
    const inviteCode = typeof body?.invite_code === "string" ? body.invite_code.trim() : "";
    if (!inviteCode || inviteCode.length < 4 || inviteCode.length > 100) {
      return json({ error: "كود الدعوة غير صالح" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invite, error: findError } = await supabaseAdmin
      .from("admin_invites")
      .select("id, role, used, expires_at")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (findError || !invite) {
      return json({ error: "كود الدعوة غير صالح" }, 400);
    }
    if (invite.used) {
      return json({ error: "كود الدعوة مستخدم بالفعل" }, 400);
    }
    if (new Date(invite.expires_at) < new Date()) {
      return json({ error: "كود الدعوة منتهي الصلاحية" }, 400);
    }

    // Atomically claim the invite for THIS user, so it cannot be reused.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("admin_invites")
      .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq("id", invite.id)
      .eq("used", false)
      .select("id, role")
      .maybeSingle();

    if (claimError || !claimed) {
      return json({ error: "كود الدعوة مستخدم بالفعل" }, 400);
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: claimed.role }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      return json({ error: "فشل في تعيين الدور" }, 500);
    }

    return json({ success: true, role: claimed.role });
  } catch (err) {
    console.error("Redeem invite error:", err);
    return json({ error: "خطأ داخلي" }, 500);
  }
});
