// Supabase Edge Function: privileged user creation for CertiVerify.
// Deploy with: supabase functions deploy admin-create-user
// Required secret: SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase function environment variables');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerData.user) {
      return json({ success: false, error: 'Authentification requise' }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, role, institution_id')
      .eq('id', callerData.user.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return json({ success: false, error: 'Acces admin requis' }, 403);
    }

    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    const role = body.role === 'admin' ? 'admin' : 'student';
    const temporaryPassword = body.temporaryPassword || generateTemporaryPassword();

    if (!email || !fullName) {
      return json({ success: false, error: 'Email et nom complet requis' }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (createError || !created.user) {
      return json({ success: false, error: createError?.message ?? 'Creation impossible' }, 400);
    }

    const { data: user, error: upsertError } = await adminClient
      .from('users')
      .upsert({
        id: created.user.id,
        email,
        full_name: fullName,
        role,
        institution_id: callerProfile.institution_id,
        is_active: true,
      })
      .select('id, email, full_name, role, institution_id, is_active, created_at, updated_at')
      .single();

    if (upsertError) {
      return json({ success: false, error: upsertError.message }, 400);
    }

    return json({
      success: true,
      data: {
        user,
        temporaryPassword,
      },
    });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Erreur serveur' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return `Cv-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12)}!`;
}
