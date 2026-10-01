import { redirect } from 'next/navigation';

/** /aide → première page d'aide. */
export default function AidePage() {
  redirect('/aide/livraison-et-paiement');
}
