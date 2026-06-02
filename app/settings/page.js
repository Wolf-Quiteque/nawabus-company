'use client';

import { useState, useEffect, useRef } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImagePlus, Save } from 'lucide-react';

export default function SettingsPage() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const savingRef = useRef(false);

  // Form fields
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Fiscal / SAF-T-AO
  const [fiscalName, setFiscalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [fiscalAddress, setFiscalAddress] = useState('');
  const [fiscalCity, setFiscalCity] = useState('');
  const [fiscalPostalCode, setFiscalPostalCode] = useState('');
  const [ivaRate, setIvaRate] = useState(14);
  const [ivaCode, setIvaCode] = useState('NOR');
  const [currencyCode, setCurrencyCode] = useState('AOA');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const { data: companyData, error } = await supabase
        .from('companies')
        .select(`id, name, license_number, contact_email, contact_phone, address, logo_url,
                 fiscal_name, tax_id, fiscal_address, fiscal_city, fiscal_postal_code,
                 iva_rate, iva_code, currency_code, fiscal_year`)
        .eq('id', profile.company_id)
        .single();

      if (error) throw error;

      setCompany(companyData);
      setName(companyData.name || '');
      setLicenseNumber(companyData.license_number || '');
      setContactEmail(companyData.contact_email || '');
      setContactPhone(companyData.contact_phone || '');
      setAddress(companyData.address || '');
      setLogoPreview(companyData.logo_url || null);
      setFiscalName(companyData.fiscal_name || '');
      setTaxId(companyData.tax_id || '');
      setFiscalAddress(companyData.fiscal_address || '');
      setFiscalCity(companyData.fiscal_city || '');
      setFiscalPostalCode(companyData.fiscal_postal_code || '');
      setIvaRate(companyData.iva_rate ?? 14);
      setIvaCode(companyData.iva_code || 'NOR');
      setCurrencyCode(companyData.currency_code || 'AOA');
      setFiscalYear(companyData.fiscal_year || new Date().getFullYear());
    } catch (err) {
      console.error('Error fetching company:', err);
      setFormError('Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setFormError(null);
    setSuccessMessage(null);

    if (!name.trim() || !licenseNumber.trim()) {
      setFormError('Nome e Número de Licença são obrigatórios.');
      savingRef.current = false;
      return;
    }

    setSaving(true);
    try {
      let logoUrl = company.logo_url;

      if (logoFile) {
        const timestamp = Date.now();
        const filePath = `${company.id}/${timestamp}-${logoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
          setFormError('Erro ao enviar logotipo: ' + uploadError.message);
          savingRef.current = false;
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);

        logoUrl = urlData?.publicUrl || logoUrl;
      }

      const payload = {
        name: name.trim(),
        license_number: licenseNumber.trim(),
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        address: address.trim() || null,
        logo_url: logoUrl,
        fiscal_name: fiscalName.trim() || null,
        tax_id: taxId.trim() || null,
        fiscal_address: fiscalAddress.trim() || null,
        fiscal_city: fiscalCity.trim() || null,
        fiscal_postal_code: fiscalPostalCode.trim() || null,
        iva_rate: Number(ivaRate) || 14,
        iva_code: ivaCode || 'NOR',
        currency_code: currencyCode || 'AOA',
        fiscal_year: Number(fiscalYear) || new Date().getFullYear(),
      };

      const { error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', company.id);

      if (error) {
        console.error('Error updating company:', error);
        setFormError(error.message || 'Erro ao atualizar empresa.');
      } else {
        setSuccessMessage('Dados da empresa atualizados com sucesso.');
        setLogoFile(null);
        fetchCompany();
      }
    } catch (err) {
      console.error('Exception updating company:', err);
      setFormError('Erro inesperado: ' + (err.message || 'Falha na operação'));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Configurações da Empresa</h1>
          <p className="text-lg">Gerencie as informações da sua empresa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando dados da empresa...</div>
            ) : !company ? (
              <div className="text-center text-red-500 py-8">Erro ao carregar empresa.</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 max-w-lg">
                <div>
                  <Label htmlFor="logo">Logotipo da Empresa</Label>
                  <div className="mt-1 flex items-center gap-4">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logotipo da empresa"
                        className="h-20 w-20 rounded object-cover border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-8 w-8" />
                      </div>
                    )}
                    <Input
                      id="logo"
                      name="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleLogoChange}
                      className="max-w-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="licenseNumber">Número de Licença</Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email de Contato</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Telefone de Contato</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-sm text-orange-600 mb-3">Fiscal / SAF-T-AO</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="fiscalName">Nome fiscal (razão social)</Label>
                      <Input
                        id="fiscalName"
                        type="text"
                        value={fiscalName}
                        onChange={(e) => setFiscalName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxId">NIF</Label>
                      <Input
                        id="taxId"
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fiscalAddress">Endereço fiscal</Label>
                      <Input
                        id="fiscalAddress"
                        type="text"
                        value={fiscalAddress}
                        onChange={(e) => setFiscalAddress(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="fiscalCity">Cidade</Label>
                        <Input
                          id="fiscalCity"
                          type="text"
                          value={fiscalCity}
                          onChange={(e) => setFiscalCity(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fiscalPostalCode">Código postal</Label>
                        <Input
                          id="fiscalPostalCode"
                          type="text"
                          value={fiscalPostalCode}
                          onChange={(e) => setFiscalPostalCode(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="ivaRate">Taxa IVA (%)</Label>
                        <Input
                          id="ivaRate"
                          type="number"
                          step="0.01"
                          value={ivaRate}
                          onChange={(e) => setIvaRate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ivaCode">Código IVA</Label>
                        <Select value={ivaCode} onValueChange={setIvaCode}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOR">NOR</SelectItem>
                            <SelectItem value="RED">RED</SelectItem>
                            <SelectItem value="INT">INT</SelectItem>
                            <SelectItem value="ISE">ISE</SelectItem>
                            <SelectItem value="OUT">OUT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="currencyCode">Moeda</Label>
                        <Input
                          id="currencyCode"
                          type="text"
                          value={currencyCode}
                          onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="fiscalYear">Exercício fiscal</Label>
                      <Input
                        id="fiscalYear"
                        type="number"
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  {formError && <p className="text-red-600 text-sm mb-2">{formError}</p>}
                  {successMessage && <p className="text-green-600 text-sm mb-2">{successMessage}</p>}
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar Alterações
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
