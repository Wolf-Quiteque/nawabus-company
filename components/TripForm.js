'use client';



import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

function formatForDateTimeLocal(v) {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function TripForm({ mode = 'add', initialData = null, onSuccess }) {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const submittingRef = useRef(false);

  // Load options
  useEffect(() => {
    fetchOptions();
  }, []);

  // Initialize for edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setRouteId(initialData.route_id || '');
      setBusId(initialData.bus_id || '');
      setDriverId(initialData.driver_id || '');
      setDepartureTime(formatForDateTimeLocal(initialData.departure_time));
      setArrivalTime(formatForDateTimeLocal(initialData.arrival_time));
      setPrice(initialData.price_usd ? String(initialData.price_usd) : '');
      setStatus(initialData.status || 'scheduled');
    } else if (mode === 'add') {
      // Reset fields for add mode
      setRouteId('');
      setBusId('');
      setDriverId('');
      setDepartureTime('');
      setArrivalTime('');
      setPrice('');
      setStatus('scheduled');
    }
  }, [mode, initialData]);

  const fetchOptions = async () => {
    try {
      const [routesRes, busesRes, driversRes] = await Promise.all([
        fetch('/api/company/routes?limit=100'),
        fetch('/api/company/buses?is_active=true&limit=100'),
        fetch('/api/company/employees?role=driver&limit=100')
      ]);

      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData.routes || []);
      }

      if (busesRes.ok) {
        const busesData = await busesRes.json();
        setBuses(busesData.buses || []);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData.employees || []);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const validate = () => {
    if (!routeId) return 'Selecione a rota.';
    if (!busId) return 'Selecione o autocarro.';
    if (!driverId) return 'Selecione o motorista.';
    if (!departureTime) return 'Defina a hora de partida.';
    if (!arrivalTime) return 'Defina a hora de chegada.';
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);
    if (!(dep instanceof Date) || isNaN(dep)) return 'Hora de partida inválida.';
    if (!(arr instanceof Date) || isNaN(arr)) return 'Hora de chegada inválida.';
    if (arr <= dep) return 'A hora de chegada deve ser depois da partida.';
    if (price !== '' && isNaN(parseFloat(price))) return 'Preço inválido.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);
    const v = validate();
    if (v) {
      setFormError(v);
      submittingRef.current = false;
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        const payload = {
          route_id: routeId,
          bus_id: busId,
          driver_id: driverId,
          departure_time: new Date(departureTime).toISOString(),
          arrival_time: new Date(arrivalTime).toISOString(),
          price: price ? parseFloat(price) : null,
        };

        const response = await fetch('/api/company/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add trip');
        }

        // Reset fields for add mode
        setRouteId('');
        setBusId('');
        setDriverId('');
        setDepartureTime('');
        setArrivalTime('');
        setPrice('');
        setStatus('scheduled');
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        // Edit mode
        const payload = {
          id: initialData.id,
          route_id: routeId,
          bus_id: busId,
          driver_id: driverId,
          departure_time: new Date(departureTime).toISOString(),
          arrival_time: new Date(arrivalTime).toISOString(),
          price: price ? parseFloat(price) : null,
          status,
        };

        const response = await fetch('/api/company/trips', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update trip');
        }

        if (typeof onSuccess === 'function') onSuccess();
      }
    } catch (error) {
      console.error('Error submitting trip:', error);
      setFormError(error.message || `Erro ao ${mode === 'add' ? 'adicionar' : 'atualizar'} viagem.`);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const formatRouteOption = (route) => {
    const origin = [route.origin_city, route.origin_province].filter(Boolean).join(', ');
    const destination = [route.destination_city, route.destination_province].filter(Boolean).join(', ');
    return `${origin} → ${destination} (${route.distance_km} km)`;
  };

  const formatBusOption = (bus) => {
    return `${bus.license_plate} - ${bus.make} ${bus.model} (${bus.capacity} lugares)`;
  };

  const formatDriverOption = (driver) => {
    return `${driver.first_name} ${driver.last_name}`;
  };

  const statuses = ['scheduled', 'boarding', 'departed', 'arrived', 'cancelled'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="route">Rota</Label>
          <Select value={routeId} onValueChange={setRouteId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione uma rota" />
            </SelectTrigger>
            <SelectContent>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {formatRouteOption(route)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="bus">Autocarro</Label>
          <Select value={busId} onValueChange={setBusId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione um autocarro" />
            </SelectTrigger>
            <SelectContent>
              {buses.map((bus) => (
                <SelectItem key={bus.id} value={bus.id}>
                  {formatBusOption(bus)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="driver">Motorista</Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione um motorista" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {formatDriverOption(driver)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="price">Preço (USD)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="departureTime">Partida</Label>
          <Input
            id="departureTime"
            name="departureTime"
            type="datetime-local"
            required
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="arrivalTime">Chegada</Label>
          <Input
            id="arrivalTime"
            name="arrivalTime"
            type="datetime-local"
            required
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className="mt-1"
          />
        </div>

        {mode === 'edit' && (
          <div className="md:col-span-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        {formError && <p className="text-red-600 text-sm mb-2">{formError}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          {mode === 'add' ? 'Adicionar Viagem' : 'Guardar Alterações'}
        </Button>
      </div>
    </form>
  );
}
