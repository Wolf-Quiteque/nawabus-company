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

export default function BusesPage() {
  const [buses, setBuses] = useState([]);
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
    fetchBuses();
  }, [pagination.page, search, isActive]);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        is_active: isActive
      });

      const response = await fetch(`/api/company/buses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch buses');

      const data = await response.json();
      setBuses(data.buses);
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

  const formatAmenities = (amenities) => {
    if (!amenities || amenities.length === 0) return 'Nenhuma';
    return amenities.map(amenity => amenity.charAt(0).toUpperCase() + amenity.slice(1)).join(', ');
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
          <h1 className="text-3xl font-bold text-orange-500">Gestão de Autocarros</h1>
          <p className="text-lg">Visualizar e gerenciar frota de autocarros</p>
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
                  placeholder="Pesquisar por matrícula, marca ou modelo..."
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

        {/* Buses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Autocarros ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando autocarros...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">Erro: {error}</div>
            ) : buses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum autocarro encontrado</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Autocarro</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Comodidades</TableHead>
                      <TableHead>Viagens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buses.map((bus) => (
                      <TableRow key={bus.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Bus className="h-4 w-4" />
                            <span>{bus.year} {bus.make}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{bus.license_plate}</TableCell>
                        <TableCell>{bus.model}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{bus.capacity} lugares</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={formatAmenities(bus.amenities)}>
                          {formatAmenities(bus.amenities)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {bus.trips?.[0]?.count || 0} viagens
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(bus.is_active)}</TableCell>
                        <TableCell>{formatDate(bus.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} autocarros
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
