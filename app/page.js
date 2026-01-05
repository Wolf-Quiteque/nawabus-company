import ClientLayout from '@/components/ClientLayout';
import { requireCompanyUser } from '@/lib/auth';
import StatisticsDashboard from '@/components/StatisticsDashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Server-side company user guard for the home page
  await requireCompanyUser();

  return (
    <ClientLayout>
      <div>
        <h1 className="text-3xl font-bold text-orange-500 mb-2">Painel da Empresa - Nawabus</h1>
        <p className="text-lg mb-6">Gerencie seus autocarros, rotas, viagens e funcionários.</p>

        <StatisticsDashboard />
      </div>
    </ClientLayout>
  );
}
