import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_code, user_id } = await req.json();

    if (!invite_code || !user_id) {
      return new Response(
        JSON.stringify({ error: "invite_code and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the invite
    const { data: invite, error: findError } = await supabaseAdmin
      .from("admin_invites")
      .select("*")
      .eq("invite_code", invite_code.trim())
      .single();

    if (findError || !invite) {
      return new Response(
        JSON.stringify({ error: "كود الدعوة غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.used) {
      return new Response(
        JSON.stringify({ error: "كود الدعوة مستخدم بالفعل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "كود الدعوة منتهي الصلاحية" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign the role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id, role: invite.role },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      console.error("Role assignment error:", roleError);
      return new Response(
        JSON.stringify({ error: "فشل في تعيين الدور" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invite as used
    await supabaseAdmin
      .from("admin_invites")
      .update({ used: true, used_by: user_id, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, role: invite.role }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Redeem invite error:", err);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
