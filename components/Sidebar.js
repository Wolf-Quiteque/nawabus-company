"use client";
import Link from 'next/link';
import { Home, Building2, UserPlus, Bus, Route, LogOut, CalendarClock, Ticket, Users, Settings, Receipt } from 'lucide-react';
import { supabase } from "lib/supabase";

const Sidebar = ({ companyName }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 p-5 glass text-foreground flex flex-col h-screen">
      <div className="mb-10">
        <Link href="/">
          <span className="text-2xl font-bold text-orange-500">{companyName}</span>
          <br />
          <span className="text-sm text-muted-foreground">Portal da Empresa</span>
        </Link>
      </div>
      <nav>
        <ul>
          <li className="mb-4">
            <Link href="/" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Home className="w-6 h-6 text-primary" />
              <span className="ml-3">Painel</span>
            </Link>
          </li>

          {/* Management Section */}
          <li className="mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestão</span>
          </li>

          <li className="mb-4">
            <Link href="/buses" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Bus className="w-6 h-6 text-primary" />
              <span className="ml-3">Autocarros</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/routes" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Route className="w-6 h-6 text-primary" />
              <span className="ml-3">Rotas</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/trips" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <CalendarClock className="w-6 h-6 text-primary" />
              <span className="ml-3">Viagens</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/employees" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Users className="w-6 h-6 text-primary" />
              <span className="ml-3">Funcionários</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/tickets" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Ticket className="w-6 h-6 text-primary" />
              <span className="ml-3">Bilhetes</span>
            </Link>
          </li>

          {/* Operations Section */}
          <li className="mb-2 mt-6">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operações</span>
          </li>

          <li className="mb-4">
            <Link href="/add-employee" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <UserPlus className="w-6 h-6 text-primary" />
              <span className="ml-3">Adicionar Funcionário</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/add-bus" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Bus className="w-6 h-6 text-primary" />
              <span className="ml-3">Adicionar Autocarro</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/add-route" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Route className="w-6 h-6 text-primary" />
              <span className="ml-3">Adicionar Rota</span>
            </Link>
          </li>

          <li className="mb-4">
            <Link href="/add-trip" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <CalendarClock className="w-6 h-6 text-primary" />
              <span className="ml-3">Adicionar Viagem</span>
            </Link>
          </li>
          {/* Fiscal Section */}
          <li className="mb-2 mt-6">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fiscal</span>
          </li>

          <li className="mb-4">
            <Link href="/saft-ao" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Receipt className="w-6 h-6 text-primary" />
              <span className="ml-3">SAF-T-AO</span>
            </Link>
          </li>

          {/* Settings Section */}
          <li className="mb-2 mt-6">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurações</span>
          </li>

          <li className="mb-4">
            <Link href="/settings" className="flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
              <Settings className="w-6 h-6 text-primary" />
              <span className="ml-3">Empresa</span>
            </Link>
          </li>
        </ul>
      </nav>
      <button onClick={handleLogout} className="mt-auto flex items-center p-2 text-base font-normal rounded-lg hover:bg-accent">
        <LogOut className="w-6 h-6 text-primary" />
        <span className="ml-3">Sair</span>
      </button>
    </div>
  );
};

export default Sidebar;
