// Hook reutilizable para web y móvil
import { useState } from 'react';

export function useGreeting(name: string) {
  const [greeting, setGreeting] = useState('');

  function updateGreeting() {
    setGreeting(`¡Hola, ${name}! Bienvenido a Neurobuildtech.`);
  }

  return { greeting, updateGreeting };
}
