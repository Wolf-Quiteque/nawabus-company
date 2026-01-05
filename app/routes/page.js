'use client';

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Route } from 'lucide-react';

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
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
  const [isActive, setIsActive] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, [pagination.page, search, isActive]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        is_active: isActive
      });

      const response = await fetch(`/api/company/routes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch routes');

      const data = await response.json();
      setRoutes(data.routes);
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

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge variant="default">Ativo</Badge>
    ) : (
      <Badge variant="secondary">Inativo</Badge>
    );
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const mins = Math.round((hours - h) * 60);
    if (h > 0) {
      return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  const formatLocation = (city, province) => {
    return province ? `${city}, ${province}` : city;
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
          <h1 className="text-3xl font-bold text-orange-500">Gestão de Rotas</h1>
          <p className="text-lg">Visualizar e gerenciar rotas da empresa</p>
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
                  placeholder="Pesquisar por origem ou destino..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Select value={isActive} onValueChange={(value) => setIsActive(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch}>Pesquisar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Routes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rotas ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando rotas...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">Erro: {error}</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma rota encontrada</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rota</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Distância</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Preço Base</TableHead>
                      <TableHead>Viagens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Route className="h-4 w-4" />
                            <span>{formatLocation(route.origin_city, route.origin_province)} → {formatLocation(route.destination_city, route.destination_province)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatLocation(route.origin_city, route.origin_province)}</TableCell>
                        <TableCell>{formatLocation(route.destination_city, route.destination_province)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{route.distance_km} km</Badge>
                        </TableCell>
                        <TableCell>{formatDuration(route.estimated_duration_hours)}</TableCell>
                        <TableCell>{route.base_price_usd.toFixed(2)} kz</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {route.trips?.[0]?.count || 0} viagens
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(route.is_active)}</TableCell>
                        <TableCell>{formatDate(route.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} rotas
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
