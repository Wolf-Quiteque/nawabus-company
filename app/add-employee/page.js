'use client';

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
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
import AddEmployeeForm from '@/components/AddEmployeeForm';
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

export default function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/company/employees');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch employees');
      }
      const json = await res.json();
      setEmployees(json.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees
    .filter((employee) => {
      const first = (employee.first_name || '').toLowerCase();
      const last = (employee.last_name || '').toLowerCase();
      const phone = (employee.phone_number || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      return first.includes(q) || last.includes(q) || phone.includes(q);
    });

  return (
    <ClientLayout>
      <div className="p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gerir Funcionários</CardTitle>
                <CardDescription>
                  Uma lista de todos os funcionários na empresa.
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Adicionar Novo Funcionário</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes abaixo para adicionar um novo funcionário.
                    </DialogDescription>
                  </DialogHeader>
                  <AddEmployeeForm
                    onEmployeeAdded={() => {
                      setIsDialogOpen(false);
                      fetchEmployees();
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
                    placeholder="Procurar funcionários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Apelido</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cargo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.first_name || ''}</TableCell>
                        <TableCell>{employee.last_name || ''}</TableCell>
                        <TableCell>{employee.phone_number || employee.phone || ''}</TableCell>
                        <TableCell>{employee.role || ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
