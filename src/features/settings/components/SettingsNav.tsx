'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Smartphone, Store, Truck, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'boutique', label: 'Boutique', icon: Store },
  { id: 'wave', label: 'Paiement Wave', icon: Smartphone },
  { id: 'livraison', label: 'Livraison', icon: Truck },
] as const;

/**
 * Sommaire des réglages : colonne collante (desktop), pastilles défilantes
 * (mobile). La section visible est mise en évidence au défilement.
 */
export default function SettingsNav({ warnings }: { warnings: Partial<Record<(typeof SECTIONS)[number]['id'], boolean>> }) {
  const [current, setCurrent] = useState<string>('boutique');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function go(event: React.MouseEvent, id: string) {
    event.preventDefault();
    setCurrent(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }

  return (
    <nav aria-label="Sections des paramètres" className="min-w-0 lg:sticky lg:top-4">
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => go(e, id)}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'flex h-11 items-center gap-3 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150 lg:rounded-2xl',
                  active ? 'bg-oud font-medium text-sur-oud' : 'bg-lin text-fumee ring-1 ring-inset ring-filet hover:text-encre lg:bg-transparent lg:ring-0 lg:hover:bg-sable',
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.7} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {warnings[id] && <span className={cn('size-2 rounded-full', active ? 'bg-or-clair' : 'bg-alerte')} aria-label="À compléter" />}
              </a>
            </li>
          );
        })}
        <li className="lg:mt-3 lg:border-t lg:border-filet lg:pt-3">
          <Link
            href="/admin/compte"
            className="flex h-11 items-center gap-3 whitespace-nowrap rounded-full bg-lin px-4 text-sm text-fumee ring-1 ring-inset ring-filet transition-colors duration-150 hover:text-encre lg:rounded-2xl lg:bg-transparent lg:ring-0 lg:hover:bg-sable"
          >
            <UserRound className="size-[18px] shrink-0" strokeWidth={1.7} aria-hidden="true" />
            <span className="flex-1">Mon compte</span>
            <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
