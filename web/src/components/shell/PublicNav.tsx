'use client';

import { type LucideIcon, Radio, Search, Siren } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSlidingPill } from '@/lib/use-sliding-pill';

// La barre publique : la même île d'encre que l'espace connecté, avec sa
// pilule papier, pour les trois pages ouvertes à tous.

type Place = { href: string; label: string; icon: LucideIcon; also?: string[] };

const PLACES: Place[] = [
  { href: '/verifier', label: 'Vérifier', icon: Search },
  { href: '/verifier/signaler', label: 'Signaler', icon: Siren, also: ['/verifier/suivi'] },
  { href: '/verifier/flash', label: 'Flash radio', icon: Radio },
];

/** La page allumée : la plus précise qui correspond (Signaler et son suivi, sinon Vérifier). */
function currentPlace(pathname: string) {
  const match = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  const precise = PLACES.findIndex(
    (place, i) => i > 0 && (match(place.href) || (place.also ?? []).some(match)),
  );
  if (precise >= 0) return precise;
  return match(PLACES[0].href) ? 0 : -1;
}

export function PublicNav() {
  const current = currentPlace(usePathname());
  const { host, pill, handlers } = useSlidingPill<HTMLUListElement>(current);
  return (
    <nav aria-label="Pages publiques" className="site-nav tab-island">
      <span ref={pill} className="tab-pill" aria-hidden />
      <ul ref={host} className="tab-list" {...handlers}>
        {PLACES.map(({ href, label, icon: Icon }, i) => (
          <li key={href}>
            <Link
              href={href}
              className="tab"
              data-ripple
              data-pill-item
              data-current={i === current || undefined}
              aria-current={i === current ? 'page' : undefined}
            >
              <Icon className="tab-icon" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
