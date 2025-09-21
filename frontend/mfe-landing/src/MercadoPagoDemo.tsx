import React, { useState } from 'react';

export default function MercadoPagoDemo() {
  const [preferenceId, setPreferenceId] = useState('');
  const [status, setStatus] = useState('');

  async function handleCreatePayment() {
    // Ejemplo de preferencia básica
    const preference = {
      items: [{ title: 'Asesoría IA', quantity: 1, unit_price: 100 }],
    };
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    });
    const data = await res.json();
    setPreferenceId(data.id);
  }

  async function handleCheckStatus() {
    if (!preferenceId) return;
    const res = await fetch(`/api/payments/status/${preferenceId}`);
    const data = await res.json();
    setStatus(data);
  }

  return (
    <div className="bg-yellow-50 p-4 rounded-lg shadow mb-4">
      <h4 className="text-lg font-bold text-yellow-700 mb-2">Demo Mercado Pago</h4>
      <button onClick={handleCreatePayment} className="bg-yellow-700 text-white px-4 py-2 rounded mb-2">Crear pago</button>
      {preferenceId && (
        <div>
          <div>ID preferencia: {preferenceId}</div>
          <button onClick={handleCheckStatus} className="bg-yellow-700 text-white px-4 py-2 rounded mt-2">Consultar estado</button>
        </div>
      )}
      {status && <div className="text-green-700 font-semibold">Estado: {status}</div>}
    </div>
  );
}
