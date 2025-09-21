import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Landing from '../Landing';

describe('Landing', () => {
  it('muestra el título principal', () => {
    render(<Landing />);
    expect(screen.getByText(/Bienvenido a Neurobuildtech/i)).toBeInTheDocument();
  });
});
