import { createContext, useContext, useState, ReactNode } from 'react';

export interface Usuario {
  id: string;
  nome: string;
}

interface UserContextType {
  usuarioAtivo: Usuario | null;
  setUsuarioAtivo: (usuario: Usuario | null) => void;
}

export const UserContext = createContext<UserContextType>({
  usuarioAtivo: null,
  setUsuarioAtivo: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuarioAtivo, setUsuarioAtivo] = useState<Usuario | null>(null);
  return (
    <UserContext.Provider value={{ usuarioAtivo, setUsuarioAtivo }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
