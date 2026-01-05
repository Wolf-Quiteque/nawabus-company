import ClientLayout from '@/components/ClientLayout';
import { requireCompanyUser } from '@/lib/auth';

export default async function AddRouteLayout({ children }) {
  // Server-side company user guard; redirects if not authorized
  await requireCompanyUser();

  return <ClientLayout>{children}</ClientLayout>;
}
