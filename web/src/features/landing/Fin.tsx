import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { Lines } from './Lines';

/** Le pied de page : l'appel final, les liens, puis le nom en très grand. */
export function Fin({ signedIn }: { signedIn: boolean }) {
  return (
    <footer id="fin" className="fin" role="contentinfo">
      <div className="fin-content">
        <Lines
          className="display fin-title"
          lines={[
            'Vérifier',
            <>
              avant de <em>partager</em>.
            </>,
          ]}
        />
        <p className="lead" data-reveal="fade">
          Quelques clics suffisent pour savoir d’où vient une information, et ce qu’elle vaut.
        </p>
        <div className="fin-actions" data-reveal="fade">
          <Link className="fin-button is-primary" href={signedIn ? AFTER_SIGN_IN_PATH : '/signup'}>
            {signedIn ? 'Ouvrir Vyra' : 'Créer un compte'}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          {!signedIn && (
            <Link className="fin-button" href="/login#demo">
              Voir la démo
            </Link>
          )}
        </div>
        <div className="fin-grid">
          <div>
            <p className="fin-brand">Vyra</p>
            <p>Voir d’où vient une information, et la faire juger sur pièces.</p>
          </div>
          <nav aria-label="Sur cette page">
            <h3>Le produit</h3>
            <ul>
              <li>
                <a href="#parcours">Le parcours</a>
              </li>
              <li>
                <a href="#tribunal">Le tribunal</a>
              </li>
              <li>
                <a href="#difference">La différence</a>
              </li>
              <li>
                <Link href="/verifier">Déjà vérifié ?</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Compte">
            <h3>Compte</h3>
            <ul>
              <li>
                <Link href="/login">Se connecter</Link>
              </li>
              <li>
                <Link href="/signup">Créer un compte</Link>
              </li>
              <li>
                <Link href="/login#demo">Comptes de démo</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="fin-legal">
          <span>DevFest Antananarivo 2026</span>
          <span>D’après le travail de l’équipe MindStack</span>
        </div>
      </div>
      <div className="fin-wordmark" aria-hidden>
        {/* Le nom tient toute la largeur : textLength cale les quatre lettres d'un bord à l'autre,
            en n'ajustant que l'espace entre elles. */}
        <svg viewBox="0 0 1000 330" role="presentation" focusable="false">
          <text x="4" y="318" textLength="992" lengthAdjust="spacing">
            VYRA
          </text>
        </svg>
      </div>
    </footer>
  );
}
