'use client';

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
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
  const [role, setRole] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [pagination.page, search, role]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role
      });

      const response = await fetch(`/api/company/employees?${params}`);
      if (!response.ok) throw new Error('Failed to fetch employees');

      const data = await response.json();
      setEmployees(data.employees);
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

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { variant: 'default', label: 'Administrador' },
      agent: { variant: 'secondary', label: 'Agente' },
      driver: { variant: 'outline', label: 'Motorista' }
    };

    const config = roleConfig[role] || { variant: 'secondary', label: role };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
          <h1 className="text-3xl font-bold text-orange-500">Gestão de Funcionários</h1>
          <p className="text-lg">Visualizar funcionários da empresa</p>
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
                  placeholder="Pesquisar por nome ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Select value={role} onValueChange={(value) => setRole(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="driver">Motorista</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch}>Pesquisar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionários ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando funcionários...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">Erro: {error}</div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Criado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>{employee.first_name} {employee.last_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{employee.phone_number}</TableCell>
                        <TableCell>{getRoleBadge(employee.role)}</TableCell>
                        <TableCell>{formatDate(employee.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} funcionários
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
