import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Landing from '../Landing';

// Mock the components that rely on external services
jest.mock('../ApolloDemo', () => {
  return function MockApolloDemo() {
    return <div>Mocked Apollo Demo</div>;
  };
});

jest.mock('../MercadoPagoDemo', () => {
  return function MockMercadoPagoDemo() {
    return <div>Mocked MercadoPago Demo</div>;
  };
});

describe('Landing', () => {
  it('muestra el título principal', () => {
    render(<Landing />);
    expect(screen.getByText(/Bienvenido a Neurobuildtech/i)).toBeInTheDocument();
  });
  
  it('muestra la descripción del micro frontend', () => {
    render(<Landing />);
    expect(screen.getByText(/Micro frontend de landing page/i)).toBeInTheDocument();
  });
});
