import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Fusionne des classes Tailwind (fonction `cn` des composants shadcn).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
