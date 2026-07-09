'use client';

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [pagination.page, search, status]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        status
      });

      const response = await fetch(`/api/company/tickets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tickets');

      const data = await response.json();
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusConfig = {
      paid: { variant: 'default', label: 'Pago' },
      pending: { variant: 'secondary', label: 'Pendente' },
      failed: { variant: 'destructive', label: 'Falhou' },
      refunded: { variant: 'outline', label: 'Reembolsado' }
    };

    const config = statusConfig[paymentStatus] || { variant: 'secondary', label: paymentStatus };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTicketStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'default', label: 'Ativo' },
      used: { variant: 'secondary', label: 'Usado' },
      cancelled: { variant: 'destructive', label: 'Cancelado' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPassengerName = (passenger) => {
    if (!passenger) return 'N/A';
    return `${passenger.first_name} ${passenger.last_name}`;
  };

  const formatTripRoute = (trip) => {
    if (!trip?.route) return 'N/A';
    return `${trip.route.origin_city} → ${trip.route.destination_city}`;
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Visualização de Bilhetes</h1>
          <p className="text-lg">Visualizar bilhetes das viagens da empresa</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar bilhetes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Select value={status} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch}>Pesquisar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bilhetes ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando bilhetes...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">Erro: {error}</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum bilhete encontrado</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Passageiro</TableHead>
                      <TableHead>Rota</TableHead>
                      <TableHead>Partida</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Ticket className="h-4 w-4" />
                            <span>{formatPassengerName(ticket.passenger)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatTripRoute(ticket.trip)}</TableCell>
                        <TableCell>{ticket.trip ? formatDateTime(ticket.trip.departure_time) : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.seat_number}</Badge>
                        </TableCell>
                        <TableCell>{ticket.price_paid_usd?.toFixed(2) || '0.00'} kz</TableCell>
                        <TableCell>{getPaymentStatusBadge(ticket.payment_status)}</TableCell>
                        <TableCell>{getTicketStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{formatDate(ticket.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} bilhetes
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
