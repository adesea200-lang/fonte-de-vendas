import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Concede o papel de administrador ao primeiro usuário cadastrado.
 * Depois que existir um admin, apenas administradores existentes podem
 * promover novos usuários pelo painel.
 */
export const reivindicarAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      const { data: mine } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      return { granted: Boolean(mine) };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Não foi possível liberar o acesso administrativo.");
    return { granted: true };
  });
