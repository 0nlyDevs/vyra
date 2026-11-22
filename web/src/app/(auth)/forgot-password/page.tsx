import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="pub-h2 text-foreground">
          Mot de passe <em>oublié</em>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Indiquez votre adresse : vous recevrez un lien pour en choisir un nouveau.
        </p>
      </header>
      <ForgotPasswordForm />
      <p className="text-sm">
        <Link
          href="/login"
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
