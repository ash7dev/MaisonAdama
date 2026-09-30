import { DashboardSkeleton } from '@/components/admin/skeletons';

/** Affichée dès le clic : la sidebar reste en place, seul le contenu attend ses données. */
export default function Loading() {
  return <DashboardSkeleton />;
}
