// Ejemplo de integración Apollo Client con GraphQL backend NestJS
import * as React from 'react';
import { 
  ApolloClient, 
  InMemoryCache, 
  gql,
  HttpLink 
} from '@apollo/client';
import { 
  ApolloProvider, 
  useQuery, 
  useMutation 
} from '@apollo/client/react';

const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:3000/graphql' }), // Cambia la URL según tu backend
  cache: new InMemoryCache(),
});

// Query para obtener el saludo desde el backend
const HELLO_QUERY = gql`
  query {
    hello
  }
`;

// Mutation para crear un usuario
const CREATE_USER = gql`
  mutation($id: String!, $name: String!) {
    createUser(id: $id, name: $name) {
      id
      name
    }
  }
`;

// Componente que muestra el resultado de la query hello
type HelloData = {
  hello: string;
};

function HelloDemo() {
  const { data, loading, error } = useQuery<HelloData>(HELLO_QUERY);
  // Muestra estado de carga, error o el resultado
  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>Respuesta GraphQL: {data?.hello}</div>;
}

// Componente para crear un usuario usando mutation
type CreateUserData = {
  createUser: {
    id: string;
    name: string;
  };
};

function CreateUserDemo() {
  const [id, setId] = React.useState('');
  const [name, setName] = React.useState('');
  const [createUser, { data, loading, error }] = useMutation<CreateUserData>(CREATE_USER);

  // Maneja el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser({ variables: { id, name } });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-green-50 p-4 rounded mb-4">
      <h4 className="text-lg font-bold text-green-700 mb-2">Crear usuario (GraphQL Mutation)</h4>
      <input
        type="text"
        placeholder="ID"
        value={id}
        onChange={e => setId(e.target.value)}
        className="p-2 rounded border border-green-200 mb-2 w-full"
      />
      <input
        type="text"
        placeholder="Nombre"
        value={name}
        onChange={e => setName(e.target.value)}
        className="p-2 rounded border border-green-200 mb-2 w-full"
      />
      <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded">Crear</button>
      {loading && <div>Cargando...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <div className="text-green-700 font-semibold">Usuario creado: {JSON.stringify(data.createUser)}</div>}
    </form>
  );
}

// Componente principal que envuelve los demos con ApolloProvider
export default function ApolloDemo() {
  return (
    <ApolloProvider client={client}>
      {/* Demo de query simple */}
      <HelloDemo />
      {/* Demo de mutation para crear usuario */}
      <CreateUserDemo />
    </ApolloProvider>
  );
}
