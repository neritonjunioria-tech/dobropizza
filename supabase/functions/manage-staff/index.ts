import { withSupabase } from 'npm:@supabase/server';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { data: callerProfile } = await ctx.supabaseAdmin
      .from('profiles')
      .select('role, permissions')
      .eq('id', ctx.userClaims!.id)
      .maybeSingle();

    const isOwner = callerProfile?.role === 'owner';
    const canManageUsers = isOwner || callerProfile?.permissions?.gerenciar_usuarios === true;

    if (!canManageUsers) {
      return new Response(JSON.stringify({ error: 'Você não tem permissão para gerenciar usuários.' }), { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { username, password, role, full_name, permissions } = body;
      if (!username || !password || !role) {
        return new Response(JSON.stringify({ error: 'Preencha usuário, senha e função.' }), { status: 400 });
      }

      const email = username.includes('@') ? username : `${username}@dobropizza.com`;

      const { data: newUser, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
      }

      const { error: profileError } = await ctx.supabaseAdmin.from('profiles').insert({
        id: newUser.user.id,
        role,
        full_name: full_name || null,
        permissions: permissions || {},
      });
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
      }

      return new Response(JSON.stringify({ success: true, id: newUser.user.id }));
    }

    if (action === 'delete') {
      const { userId } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'ID não informado.' }), { status: 400 });
      }
      if (userId === ctx.userClaims!.id) {
        return new Response(JSON.stringify({ error: 'Você não pode remover o seu próprio usuário enquanto estiver logado nele. Faça login com o novo usuário antes de excluir este.' }), { status: 400 });
      }
      
      // Delete from profiles first to avoid foreign key constraints
      await ctx.supabaseAdmin.from('profiles').delete().eq('id', userId);

      const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message || String(deleteError) }), { status: 400 });
      }
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida.' }), { status: 400 });
  }),
};
