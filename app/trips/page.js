'use client';

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Bus } from 'lucide-react';

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchTrips();
  }, [pagination.page, status]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        status
      });

      const response = await fetch(`/api/company/trips?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trips');

      const data = await response.json();
      setTrips(data.trips);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: 'default', label: 'Agendada' },
      in_progress: { variant: 'secondary', label: 'Em Progresso' },
      arrived: { variant: 'outline', label: 'Chegada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDriverName = (driver) => {
    if (!driver) return 'N/A';
    return `${driver.first_name} ${driver.last_name}`;
  };

  const formatLocation = (city, province) => {
    return province ? `${city}, ${province}` : city;
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Gestão de Viagens</h1>
          <p className="text-lg">Visualizar e gerenciar viagens da empresa</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={status} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="arrived">Chegada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}>Aplicar Filtros</Button>
            </div>
          </CardContent>
        </Card>

        {/* Trips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Viagens ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando viagens...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">Erro: {error}</div>
            ) : trips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma viagem encontrada</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rota</TableHead>
                      <TableHead>Autocarro</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Partida</TableHead>
                      <TableHead>Chegada</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Bilhetes</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          {trip.route ? `${formatLocation(trip.route.origin_city, trip.route.origin_province)} → ${formatLocation(trip.route.destination_city, trip.route.destination_province)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {trip.bus ? (
                            <div className="flex items-center space-x-2">
                              <Bus className="h-4 w-4" />
                              <span>{trip.bus.license_plate}</span>
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>{formatDriverName(trip.driver)}</TableCell>
                        <TableCell>{formatDateTime(trip.departure_time)}</TableCell>
                        <TableCell>{formatDateTime(trip.arrival_time)}</TableCell>
                        <TableCell>{trip.price_usd.toFixed(2)} kz</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {trip.tickets?.[0]?.count || 0} bilhetes
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(trip.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} viagens
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
