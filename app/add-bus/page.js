'use client';

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import AddBusForm from '@/components/AddBusForm';
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

export default function BusPage() {
  const [buses, setBuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBuses = async () => {
    try {
      const response = await fetch('/api/company/buses');
      if (!response.ok) {
        throw new Error('Failed to fetch buses');
      }
      const data = await response.json();
      setBuses(data.buses || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  useEffect(() => {
    fetchBuses();
    setLoading(false);
  }, []);

  const filteredBuses = buses.filter(
    (bus) =>
      bus.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ClientLayout>
      <div className="p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gerir Autocarros</CardTitle>
                <CardDescription>
                  Uma lista de todos os autocarros no sistema.
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Adicionar Novo Autocarro</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Autocarro</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes abaixo para adicionar um novo autocarro.
                    </DialogDescription>
                  </DialogHeader>
                  <AddBusForm
                    onBusAdded={() => {
                      setIsDialogOpen(false);
                      fetchBuses();
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
                    placeholder="Procurar autocarros..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Capacidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuses.map((bus) => (
                      <TableRow key={bus.id}>
                        <TableCell>{bus.license_plate}</TableCell>
                        <TableCell>{bus.make}</TableCell>
                        <TableCell>{bus.model}</TableCell>
                        <TableCell>{bus.year}</TableCell>
                        <TableCell>{bus.capacity}</TableCell>
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
