'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import ClientLayout from '@/components/ClientLayout';
import TripForm from '@/components/TripForm';

export default function TripPage() {
  const [trips, setTrips] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/company/trips?limit=100');
      if (response.ok) {
        const data = await response.json();
        setTrips(data.trips || []);
      } else {
        console.error('Error fetching trips');
        setTrips([]);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      try {
        await fetchTrips();
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  const formatDateTime = (v) => {
    if (!v) return '';
    try {
      return new Date(v).toLocaleString();
    } catch {
      return String(v);
    }
  };

  const formatRoute = (route) => {
    if (!route) return '-';
    const origin = [route.origin_city, route.origin_province].filter(Boolean).join(', ');
    const destination = [route.destination_city, route.destination_province].filter(Boolean).join(', ');
    return `${origin} → ${destination}`;
  };

  const formatBus = (bus) => {
    if (!bus) return '-';
    return bus.license_plate;
  };

  const formatDriver = (driver) => {
    if (!driver) return '-';
    return `${driver.first_name} ${driver.last_name}`.trim();
  };

  const filteredTrips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((t) => {
      const routeLabel = formatRoute(t.route).toLowerCase();
      const busLabel = formatBus(t.bus).toLowerCase();
      const driverLabel = formatDriver(t.driver).toLowerCase();
      return (
        routeLabel.includes(q) ||
        busLabel.includes(q) ||
        driverLabel.includes(q) ||
        (t.status || '').toLowerCase().includes(q)
      );
    });
  }, [trips, searchTerm]);

  return (
    <ClientLayout>
      <div className="p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gerir Viagens</CardTitle>
                <CardDescription>Uma lista de todas as viagens no sistema.</CardDescription>
              </div>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button>Adicionar Nova Viagem</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Viagem</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes abaixo para adicionar uma nova viagem.
                    </DialogDescription>
                  </DialogHeader>
                  <TripForm
                    mode="add"
                    onSuccess={() => {
                      setIsAddOpen(false);
                      fetchTrips();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="animate-spin h-8 w-8" />
                <span className="ml-2">A carregar...</span>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Input
                    placeholder="Procurar viagens (rota, matrícula, motorista, estado)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-lg"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rota</TableHead>
                      <TableHead>Autocarro</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Partida</TableHead>
                      <TableHead>Chegada</TableHead>
                      <TableHead>Preço (USD)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="max-w-xs">{formatRoute(t.route)}</TableCell>
                        <TableCell>{formatBus(t.bus)}</TableCell>
                        <TableCell>{formatDriver(t.driver)}</TableCell>
                        <TableCell>{formatDateTime(t.departure_time)}</TableCell>
                        <TableCell>{formatDateTime(t.arrival_time)}</TableCell>
                        <TableCell>{t.price_usd}</TableCell>
                        <TableCell className="capitalize">{t.status}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTrip(t);
                              setIsEditOpen(true);
                            }}>
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Viagem</DialogTitle>
                      <DialogDescription>Altere os detalhes da viagem e guarde.</DialogDescription>
                    </DialogHeader>
                    {selectedTrip && (
                      <TripForm
                        mode="edit"
                        initialData={selectedTrip}
                        onSuccess={() => {
                          setIsEditOpen(false);
                          setSelectedTrip(null);
                          fetchTrips();
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
