// Supabase Edge Function: invite-user
// Convida um novo usuario por e-mail usando a Admin API do Supabase Auth.
// So pode ser chamada por um usuario logado com role = 'Administrador'
// (verificado via RLS/JWT abaixo).
//
// DEPLOY: ver Etapa 1.6 do guia de publicacao (FinGest_Guia_Publicacao.docx)
// Comando: supabase functions deploy invite-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Cliente com o token do usuario que esta chamando, para verificar quem e
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com privilegios de administrador, para checar o perfil e convidar
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from("profiles").select("role, active").eq("id", caller.id).single();

    if (!callerProfile || callerProfile.role !== "Administrador" || !callerProfile.active) {
      return new Response(JSON.stringify({ error: "Apenas Administradores podem convidar usuários." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, name, role } = await req.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ error: "E-mail e nome são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name, role: role === "Administrador" ? "Administrador" : "Usuario" },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
