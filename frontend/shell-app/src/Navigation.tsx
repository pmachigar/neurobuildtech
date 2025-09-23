import * as React from 'react';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              NeuroBuildTech
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/" className="hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                Inicio
              </Link>
              <Link href="/services" className="hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                Servicios
              </Link>
              <Link href="/consulting" className="hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                Consultoría
              </Link>
              <Link href="/ai-tools" className="hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                Herramientas IA
              </Link>
              <Link href="/iot" className="hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                IoT & Domótica
              </Link>
              <Link href="/dashboard" className="hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md text-sm font-medium">
              Login
            </button>
            <button className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md text-sm font-medium">
              Registro
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}