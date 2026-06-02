import { NextResponse } from 'next/server';
import { requireCompanyUser } from '@/lib/auth';
import { exportSaftAo } from '@/lib/saft-ao/export.js';
import { validateSaftAoXml } from '@/lib/saft-ao/validate.js';

export async function GET(request) {
  try {
    const { supabase, profile } = await requireCompanyUser();
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get('year'), 10);
    const month = parseInt(searchParams.get('month'), 10);
    const mode = searchParams.get('mode') || 'download';

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'year and month (1-12) are required' },
        { status: 400 }
      );
    }

    // Always use the authenticated user's own company — never trust the client.
    const companyId = profile.company_id;

    const { xml, filename, summary } = await exportSaftAo(supabase, {
      companyId,
      year,
      month,
    });

    if (mode === 'summary') {
      const validation = await validateSaftAoXml(xml);
      return NextResponse.json({ summary, validation, filename });
    }

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('SAF-T-AO export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    );
  }
}
