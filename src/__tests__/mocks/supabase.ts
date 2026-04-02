
import { vi } from 'vitest';

export const createMockSupabase = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selfObject: Record<string, any> = {};
  const mockFrom = vi.fn().mockReturnValue(selfObject);
  const mockSelect = vi.fn().mockReturnValue(selfObject);
  const mockInsert = vi.fn().mockReturnValue(selfObject);
  const mockUpdate = vi.fn().mockReturnValue(selfObject);
  const mockDelete = vi.fn().mockReturnValue(selfObject);
  const mockEq = vi.fn().mockReturnValue(selfObject);
  const mockIn = vi.fn().mockReturnValue(selfObject);
  const mockOrder = vi.fn().mockReturnValue(selfObject);
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  Object.assign(selfObject, {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    rpc: mockRpc,
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      rpc: mockRpc,
    }
  });

  return selfObject;
};
