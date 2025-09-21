import React from "react";

const RemoteExample = () => (
  <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-4 rounded">
    <h4 className="text-lg font-bold text-green-700 mb-1">Componente Remoto</h4>
    <p className="text-green-800">Este componente está expuesto vía Module Federation y puede ser consumido por otros micro frontends.</p>
  </div>
);

export default RemoteExample;
