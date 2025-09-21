"use client";
import { useGreeting } from "@/../../packages/shared-logic/useGreeting";
import { useState } from "react";

export default function GreetingDemo() {
  const [name, setName] = useState("");
  const { greeting, updateGreeting } = useGreeting(name);

  return (
    <div className="bg-blue-50 p-4 rounded-lg shadow mb-4">
      <h4 className="text-lg font-bold text-blue-700 mb-2">Demo lógica compartida</h4>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Tu nombre"
        className="p-2 rounded border border-blue-200 mb-2 w-full"
      />
      <button
        onClick={updateGreeting}
        className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition mb-2"
      >
        Saludar
      </button>
      {greeting && <div className="text-green-700 font-semibold">{greeting}</div>}
    </div>
  );
}
