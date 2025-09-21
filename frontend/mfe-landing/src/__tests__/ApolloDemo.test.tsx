import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ApolloDemo from '../ApolloDemo';

describe('ApolloDemo', () => {
  it('renderiza el componente sin errores', () => {
    render(<ApolloDemo />);
    expect(screen.getByText(/Crear usuario/i)).toBeInTheDocument();
  });
});
