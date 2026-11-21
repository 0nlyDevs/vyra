import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">Mot de passe oublié</h1>
        <p className="text-muted-foreground">
          Indiquez votre adresse : vous recevrez un lien pour en choisir un nouveau.
        </p>
      </header>
      <ForgotPasswordForm />
      <Link href="/login" className="text-primary text-sm underline-offset-4 hover:underline">
        Retour à la connexion
      </Link>
    </div>
  );
}
