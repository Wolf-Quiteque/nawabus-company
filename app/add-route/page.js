'use client';

import { useState, useEffect } from 'react';
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

import { Label } from '@/components/ui/label';

export default function RoutePage() {
  const [routes, setRoutes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [originCity, setOriginCity] = useState('');
  const [originProvince, setOriginProvince] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationProvince, setDestinationProvince] = useState('');
  const [basePriceUsd, setBasePriceUsd] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/company/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes);
      } else {
        console.error('Error fetching routes');
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      try {
        await fetchRoutes();
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  const handleAddRoute = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/company/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin_city: originCity,
          origin_province: originProvince,
          destination_city: destinationCity,
          destination_province: destinationProvince,
          base_price_usd: parseFloat(basePriceUsd),
        }),
      });
      if (response.ok) {
        setIsDialogOpen(false);
        setOriginCity('');
        setOriginProvince('');
        setDestinationCity('');
        setDestinationProvince('');
        setBasePriceUsd('');
        fetchRoutes();
      } else {
        console.error('Error adding route');
      }
    } catch (error) {
      console.error('Error adding route:', error);
    }
  };

  const filteredRoutes = routes.filter(
    (route) =>
      (route.origin_city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.origin_province || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.destination_city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.destination_province || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerir Rotas</CardTitle>
              <CardDescription>
                Uma lista de todas as rotas no sistema.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Adicionar Nova Rota</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Rota</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes abaixo para adicionar uma nova rota.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddRoute} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="originCity">Cidade de Origem</Label>
                      <Input
                        id="originCity"
                        name="originCity"
                        type="text"
                        required
                        value={originCity}
                        onChange={(e) => setOriginCity(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="originProvince">Província de Origem</Label>
                      <Input
                        id="originProvince"
                        name="originProvince"
                        type="text"
                        required
                        value={originProvince}
                        onChange={(e) => setOriginProvince(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destinationCity">Cidade de Destino</Label>
                      <Input
                        id="destinationCity"
                        name="destinationCity"
                        type="text"
                        required
                        value={destinationCity}
                        onChange={(e) => setDestinationCity(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destinationProvince">Província de Destino</Label>
                      <Input
                        id="destinationProvince"
                        name="destinationProvince"
                        type="text"
                        required
                        value={destinationProvince}
                        onChange={(e) => setDestinationProvince(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="basePriceUsd">Preço Base (USD)</Label>
                      <Input
                        id="basePriceUsd"
                        name="basePriceUsd"
                        type="number"
                        step="0.01"
                        required
                        value={basePriceUsd}
                        onChange={(e) => setBasePriceUsd(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Button type="submit" className="w-full">
                      Adicionar Rota
                    </Button>
                  </div>
                </form>
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
                  placeholder="Procurar rotas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cidade de Origem</TableHead>
                    <TableHead>Província de Origem</TableHead>
                    <TableHead>Cidade de Destino</TableHead>
                    <TableHead>Província de Destino</TableHead>
                    <TableHead>Preço Base (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell>{route.origin_city}</TableCell>
                      <TableCell>{route.origin_province}</TableCell>
                      <TableCell>{route.destination_city}</TableCell>
                      <TableCell>{route.destination_province}</TableCell>
                      <TableCell>{route.base_price_usd}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
