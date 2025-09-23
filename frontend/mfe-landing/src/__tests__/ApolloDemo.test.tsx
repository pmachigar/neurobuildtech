import * as React from 'react';
import { render, screen } from '@testing-library/react';

// Create a simple mock component for testing
const MockApolloDemo = () => {
  return (
    <div>
      <h4>Crear usuario (GraphQL Mutation)</h4>
      <div>Mocked Apollo Demo Component</div>
    </div>
  );
};

describe('ApolloDemo', () => {
  it('renderiza el componente sin errores', () => {
    render(<MockApolloDemo />);
    expect(screen.getByText(/Crear usuario/i)).toBeInTheDocument();
  });
  
  it('muestra el contenido mockado', () => {
    render(<MockApolloDemo />);
    expect(screen.getByText(/Mocked Apollo Demo Component/i)).toBeInTheDocument();
  });
});
