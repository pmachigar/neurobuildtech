import * as React from 'react';

interface Service {
  id: string;
  name: string;
  description: string;
  category: 'IA' | 'n8n' | 'IoT' | 'Domótica';
  price: number;
  features: string[];
}

const services: Service[] = [
  {
    id: '1',
    name: 'Consultoría en IA',
    description: 'Implementación de soluciones de inteligencia artificial personalizadas',
    category: 'IA',
    price: 150,
    features: ['Análisis de datos', 'Machine Learning', 'Deep Learning', 'Computer Vision']
  },
  {
    id: '2',
    name: 'Automatización n8n',
    description: 'Creación de flujos de trabajo automatizados con n8n',
    category: 'n8n',
    price: 100,
    features: ['Integración de APIs', 'Automatización de procesos', 'Flujos personalizados']
  },
  {
    id: '3',
    name: 'Soluciones IoT',
    description: 'Desarrollo de dispositivos y sistemas IoT conectados',
    category: 'IoT',
    price: 200,
    features: ['Sensores', 'Conectividad', 'Dashboard', 'Análisis en tiempo real']
  },
  {
    id: '4',
    name: 'Domótica Inteligente',
    description: 'Automatización y control inteligente del hogar',
    category: 'Domótica',
    price: 180,
    features: ['Control de luces', 'Clima inteligente', 'Seguridad', 'Integración por voz']
  }
];

export default function ServiceCatalog() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Catálogo de Servicios</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-800">{service.name}</h3>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {service.category}
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">{service.description}</p>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Características:</h4>
              <ul className="list-disc list-inside space-y-1">
                {service.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600">{feature}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-green-600">${service.price}/hora</span>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Solicitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}