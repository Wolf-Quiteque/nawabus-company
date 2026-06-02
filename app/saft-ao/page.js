'use client';

import { useState } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function CompanySaftAoPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);

  async function runSummary() {
    setLoading(true);
    setError(null);
    setSummary(null);
    setValidation(null);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        mode: 'summary',
      });
      const res = await fetch(`/api/company/saft-ao/export?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details);
      setSummary(data.summary);
      setValidation(data.validation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadXml() {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    window.location.href = `/api/company/saft-ao/export?${params}`;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">SAF-T-AO</h1>
          <p className="text-lg">
            Exporte o ficheiro mensal SAF-T-AO da sua empresa para submissão à AGT.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                />
              </div>
              <div>
                <Label>Mês</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runSummary} disabled={loading}>
                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Validar
              </Button>
              <Button variant="outline" onClick={downloadXml}>
                <Download className="mr-2 h-4 w-4" />
                Baixar XML
              </Button>
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Nº de faturas</dt>
                  <dd className="text-2xl font-bold">{summary.invoiceCount}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Líquido (AOA)</dt>
                  <dd className="text-2xl font-bold">{Number(summary.netTotal).toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">IVA (AOA)</dt>
                  <dd className="text-2xl font-bold">{Number(summary.ivaTotal).toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Total (AOA)</dt>
                  <dd className="text-2xl font-bold">{Number(summary.grossTotal).toFixed(2)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {validation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validation.unavailable ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : validation.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Validação XSD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{validation.message}</p>
              {validation.errors?.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 font-mono space-y-1 max-h-48 overflow-auto">
                  {validation.errors.map((e, i) => (
                    <li key={i}>
                      L{e.line}:C{e.column} — {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
