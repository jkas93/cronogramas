'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

// ─── Crear cuenta de usuario (por invitación email) ───
export async function inviteUser(email: string, fullName: string) {
  await requireSuperadmin();
  const adminSupabase = createAdminClient();
  
  // Supabase envía un email de invitación automáticamente
  // El usuario elige su propia contraseña al hacer clic en el link
  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  });
  
  if (error) throw new Error(error.message);
  
  // Registrar en auditoría
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && data.user) {
    await supabase.from('admin_audit_log').insert({
      actor_id: user.id,
      action: 'invite_user',
      target_type: 'user',
      target_id: data.user.id,
      details: { email, full_name: fullName }
    });
  }
  
  revalidatePath('/admin');
  return { success: true, userId: data.user?.id };
}

// ─── Cambiar system_role de un usuario ───
export async function updateSystemRole(targetUserId: string, newRole: 'user' | 'superadmin') {
  await requireSuperadmin();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // No puede cambiar su propio rol
  if (user!.id === targetUserId) {
    throw new Error('No puedes cambiar tu propio rol de sistema.');
  }

  // Obtener rol actual para auditoría
  const { data: target } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', targetUserId)
    .single();

  const { error } = await supabase
    .from('profiles')
    .update({ system_role: newRole })
    .eq('id', targetUserId);
    
  if (error) throw new Error(error.message);

  // Auditoría
  await supabase.from('admin_audit_log').insert({
    actor_id: user!.id,
    action: 'change_system_role',
    target_type: 'system_role',
    target_id: targetUserId,
    details: { old_role: target?.system_role, new_role: newRole }
  });
  
  revalidatePath('/admin');
}

// ─── Obtener TODOS los proyectos (para dashboard admin) ───
export async function getAllProjects() {
  await requireSuperadmin();
  const supabase = await createClient();
  // RLS ampliado permite ver todos los proyectos
  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:owner_id(full_name, email:id)') 
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}

// ─── Obtener TODOS los usuarios ───
export async function getAllUsers() {
  await requireSuperadmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, system_role, created_at')
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);

  const { data: allMembersData } = await supabase
    .from('project_members')
    .select('user_id, role, projects(name)');

  const { data: allOwnedProjects } = await supabase
    .from('projects')
    .select('owner_id, name');
  
  // Vamos a añadir el email desde la db o auth
  const adminSupabase = createAdminClient();
  const usersWithEmailAndProjects = await Promise.all(data.map(async (u) => {
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(u.id);

    const memberOf = (allMembersData || [])
      .filter((m: { user_id: string; projects: unknown }) => m.user_id === u.id && m.projects)
      .map((m: { role: string; projects: { name?: string } | { name?: string }[] | null }) => ({
        name: (Array.isArray(m.projects) ? m.projects[0]?.name : m.projects?.name) ?? '',
        role: m.role
      }))
      .filter((p) => p.name !== '');

    const owned = (allOwnedProjects || [])
      .filter((p: { owner_id: string }) => p.owner_id === u.id)
      .map((p: { name: string }) => ({
        name: p.name,
        role: 'owner'
      }));

    const combinedProjects = [...owned, ...memberOf];

    // remove duplicates by name just in case
    const uniqueProjects = Array.from(new Map(combinedProjects.map(item => [item.name, item])).values());

    return {
      ...u,
      email: authUser.user?.email || 'Desconocido',
      projects: uniqueProjects
    };
  }));
  
  return usersWithEmailAndProjects;
}

// ─── Eliminar usuario ───
export async function deleteUser(targetUserId: string) {
  await requireSuperadmin();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user!.id === targetUserId) {
    throw new Error('No puedes eliminar tu propia cuenta de superadministrador.');
  }

  // Prevenir eliminación si el usuario es dueño de proyectos
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', targetUserId);

  if (count && count > 0) {
    throw new Error(`El usuario posee ${count} proyecto(s). Debes eliminar o transferir sus proyectos antes de borrar su cuenta.`);
  }

  // Ejecutar borrado permanente vía Supabase Admin
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.auth.admin.deleteUser(targetUserId);
  if (error) throw new Error('Error al eliminar cuenta: ' + error.message);

  // Auditoría
  await supabase.from('admin_audit_log').insert({
    actor_id: user!.id,
    action: 'delete_user',
    target_type: 'user',
    target_id: targetUserId,
    details: { removed_id: targetUserId }
  });

  revalidatePath('/admin');
}
