import { requireSuperadmin } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Solo los superadmins pueden pasar de aquí
  await requireSuperadmin();

  return (
    <div className="w-full h-full fade-in pb-16 md:pb-0">
      <div className="bg-mesh" />
      {children}
    </div>
  );
}
