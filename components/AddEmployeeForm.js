'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function AddEmployeeForm({ onEmployeeAdded }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('agent');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const submittingRef = useRef(false);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);

    if (password.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres.');
      setSubmitting(false);
      submittingRef.current = false;
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        role,
        password,
      };

      const response = await fetch('/api/company/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add employee');
      }

      setFirstName('');
      setLastName('');
      setPhone('');
      setRole('agent');
      setPassword('');
      if (typeof onEmployeeAdded === 'function') onEmployeeAdded();
    } catch (error) {
      console.error('Error adding employee:', error);
      setFormError(error.message || 'Erro ao adicionar funcionário.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleAddEmployee} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">Nome</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Apelido</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="role">Cargo</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione um cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent">Agente</SelectItem>
              <SelectItem value="driver">Motorista</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        {formError && <p className="text-red-600 text-sm mb-2">{formError}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          Adicionar Funcionário
        </Button>
      </div>
    </form>
  );
}
