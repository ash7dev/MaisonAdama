import { cookies } from 'next/headers';
import { requireAdmin } from '@/features/auth/require-admin';
import { ROLE_LABEL } from '@/features/auth/roles';
import { getAdminCounts } from '@/features/admin/queries';
import { SIDEBAR_COOKIE } from '@/features/admin/navigation';
import AdminSidebar, { type AdminBadges } from '@/components/layout/AdminSidebar';
import AdminBottomNav from '@/components/layout/AdminBottomNav';
import AdminMobileHeader from '@/components/layout/AdminMobileHeader';
import { ToastProvider } from '@/components/ui/toast';
import { AdminMain, AdminNavigationProvider } from '@/components/layout/AdminNavigation';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // En parallèle : la vérification admin ne retarde pas la lecture des compteurs
  // (rien n'est affiché si elle échoue : redirection vers la connexion).
  const [admin, counts, cookieStore] = await Promise.all([requireAdmin(), getAdminCounts(), cookies()]);

  const badges: AdminBadges = {
    orders: {
      count: counts.ordersToConfirm,
      tone: 'or',
      label: `${counts.ordersToConfirm} à confirmer`,
    },
    products: {
      count: counts.lowStock,
      tone: 'alerte',
      label: `${counts.lowStock} stock${counts.lowStock > 1 ? 's' : ''} bas`,
    },
  };
  const identity = { fullName: admin.fullName, email: admin.email, roleLabel: ROLE_LABEL[admin.role] };

  return (
    <ToastProvider>
    <AdminNavigationProvider>
    <div className="min-h-dvh bg-sable lg:flex lg:gap-4 lg:p-4">
      <AdminSidebar
        initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === 'collapsed'}
        badges={badges}
        admin={identity}
      />

      <div className="min-w-0 flex-1">
        {/* En-tête mobile (masqué sur l'accueil) : la navigation vit dans la barre du bas */}
        <AdminMobileHeader identity={identity} />

        <AdminMain>{children}</AdminMain>
      </div>

      <AdminBottomNav badges={badges} admin={identity} />
    </div>
    </AdminNavigationProvider>
    </ToastProvider>
  );
}
