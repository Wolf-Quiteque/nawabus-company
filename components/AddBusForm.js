'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function AddBusForm({ onBusAdded }) {
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const submittingRef = useRef(false);

  const handleAddBus = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        license_plate: licensePlate.trim(),
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(year, 10) : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
      };

      const response = await fetch('/api/company/buses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add bus');
      }

      setLicensePlate('');
      setMake('');
      setModel('');
      setYear('');
      setCapacity('');
      if (typeof onBusAdded === 'function') onBusAdded();
    } catch (error) {
      console.error('Error adding bus:', error);
      setFormError(error.message || 'Erro ao adicionar autocarro.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleAddBus} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="licensePlate">Matrícula</Label>
          <Input
            id="licensePlate"
            name="licensePlate"
            type="text"
            required
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="make">Marca</Label>
          <Input
            id="make"
            name="make"
            type="text"
            required
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="model">Modelo</Label>
          <Input
            id="model"
            name="model"
            type="text"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input
            id="year"
            name="year"
            type="number"
            required
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="capacity">Capacidade</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            required
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        {formError && <p className="text-red-600 text-sm mb-2">{formError}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          Adicionar Autocarro
        </Button>
      </div>
    </form>
  );
}
