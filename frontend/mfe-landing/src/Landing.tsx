import ApolloDemo from './ApolloDemo';
import MercadoPagoDemo from './MercadoPagoDemo';
import * as React from 'react';
// Necesario para que JSX funcione correctamente en TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export default function Landing() {
  return (
    <div>
      <h1>Bienvenido a Neurobuildtech</h1>
      <p>Micro frontend de landing page.</p>
  <MercadoPagoDemo />
  {/* Ejemplo de integración GraphQL con Apollo Client y backend NestJS */}
  <ApolloDemo />
    </div>
  );
}
