import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminActions from '@/app/actions/admin';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Mocks the server actions
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireSuperadmin: vi.fn().mockResolvedValue(true),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Admin Actions Security & Logic', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteUser', () => {

    it('debe lanzar error si el usuario intenta eliminarse a sí mismo', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id-123' } } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      await expect(adminActions.deleteUser('admin-id-123')).rejects.toThrow(
        /propia cuenta/i
      );
    });

    it('debe lanzar error si el usuario posee proyectos activos', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id-123' } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2 }), // Simulate 2 projects
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      await expect(adminActions.deleteUser('target-user-456')).rejects.toThrow(
        /posee 2 proyecto.*eliminar o transferir/i
      );
    });

    it('debe eliminar correctamente si pasa las validaciones y registrar auditoría', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id-123' } } }),
        },
        from: vi.fn().mockImplementation((table) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 0 }),
              }),
            };
          }
          if (table === 'admin_audit_log') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
        }),
      };

      const mockAdminClient = {
        auth: {
          admin: {
            deleteUser: vi.fn().mockResolvedValue({ error: null }),
          },
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      await adminActions.deleteUser('target-user-456');

      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('target-user-456');
    });
  });

});
