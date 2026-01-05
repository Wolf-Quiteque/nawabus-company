'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function AddRouteForm({ onRouteAdded }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState('');
  const [priceBase, setPriceBase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const submittingRef = useRef(false);

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);
    setSubmitting(true);

    try {
      const payload = {
        origin: origin.trim(),
        destination: destination.trim(),
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        estimated_duration_minutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes) : null,
        price_base: priceBase ? parseFloat(priceBase) : null,
      };

      const response = await fetch('/api/company/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add route');
      }

      setOrigin('');
      setDestination('');
      setDistanceKm('');
      setEstimatedDurationMinutes('');
      setPriceBase('');
      if (typeof onRouteAdded === 'function') onRouteAdded();
    } catch (error) {
      console.error('Error adding route:', error);
      setFormError(error.message || 'Erro ao adicionar rota.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleAddRoute} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="origin">Origem</Label>
          <Input
            id="origin"
            name="origin"
            type="text"
            required
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="destination">Destino</Label>
          <Input
            id="destination"
            name="destination"
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="distanceKm">Distância (km)</Label>
          <Input
            id="distanceKm"
            name="distanceKm"
            type="number"
            step="0.1"
            required
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="estimatedDurationMinutes">Duração Estimada (minutos)</Label>
          <Input
            id="estimatedDurationMinutes"
            name="estimatedDurationMinutes"
            type="number"
            required
            value={estimatedDurationMinutes}
            onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="priceBase">Preço Base (kz)</Label>
          <Input
            id="priceBase"
            name="priceBase"
            type="number"
            step="0.01"
            required
            value={priceBase}
            onChange={(e) => setPriceBase(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        {formError && <p className="text-red-600 text-sm mb-2">{formError}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          Adicionar Rota
        </Button>
      </div>
    </form>
  );
}
