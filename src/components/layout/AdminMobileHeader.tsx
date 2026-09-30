'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AccountMenu from '@/features/auth/components/AccountMenu';

/**
 * En-tête mobile de l'admin. Masqué sur l'accueil : le tableau de bord mobile
 * a son propre en-tête « wallet ».
 */
export default function AdminMobileHeader({ identity }: { identity: { fullName: string; email: string; roleLabel: string } }) {
  const pathname = usePathname();
  if (pathname === '/admin') return null;
  return (
    <header className="sticky top-0 z-30 px-3 pt-2.5 lg:hidden">
      <div className="flex h-[58px] items-center gap-2.5 rounded-full border border-filet bg-lin/92 pl-2 pr-1.5 shadow-md backdrop-blur-md">
        <Link href="/admin" className="flex items-center gap-2.5 rounded-full">
          <Image src="/images/logomasonAdama.jpg" alt="" width={80} height={80} className="size-[38px] rounded-full ring-1 ring-filet" />
          <span className="flex flex-col gap-1">
            <span className="font-display text-[1.125rem] leading-none text-oud">Maison Adama</span>
            <span className="text-[0.53125rem] leading-none tracking-[0.3em] text-or-profond">ADMINISTRATION</span>
          </span>
        </Link>
        <div className="ml-auto">
          <AccountMenu fullName={identity.fullName} email={identity.email} roleLabel={identity.roleLabel} />
        </div>
      </div>
    </header>
  );
}
