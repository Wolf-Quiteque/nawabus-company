import ClientLayout from '@/components/ClientLayout';
import { requireCompanyUser } from '@/lib/auth';
import StatisticsDashboard from '@/components/StatisticsDashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Server-side company user guard for the home page
  const { supabase, profile } = await requireCompanyUser();

  // Get company information
  const { data: company, error } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single();

  const companyName = company?.name || 'Empresa';

  return (
    <ClientLayout companyName={companyName}>
      <div>
        <h1 className="text-3xl font-bold text-orange-500 mb-2">Painel da Empresa - {companyName}</h1>
        <p className="text-lg mb-6">Gerencie seus autocarros, rotas, viagens e funcionários.</p>

        <StatisticsDashboard />
      </div>
    </ClientLayout>
  );
}
