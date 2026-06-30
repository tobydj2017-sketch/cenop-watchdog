import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  UserAccount,
  UserPermissions,
  getCurrentUser,
  login as doLogin,
  logout as doLogout,
  bootstrapUsers,
  isOwnService,
} from "./authStore";

interface AuthContextValue {
  user: UserAccount | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<UserAccount>;
  logout: () => void;
  refresh: () => void;
  can: (perm: keyof UserPermissions) => boolean;
  canEditService: (service: { chofer?: string; custodio?: string }) => boolean;
  canDeleteService: (service: { chofer?: string; custodio?: string }) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await bootstrapUsers();
      setUser(getCurrentUser());
      setReady(true);
    })();
  }, []);

  const refresh = useCallback(() => setUser(getCurrentUser()), []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await doLogin(username, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  const can = useCallback(
    (perm: keyof UserPermissions) => !!user && !!user.permissions[perm],
    [user],
  );

  const canEditService = useCallback(
    (service: { chofer?: string; custodio?: string }) => {
      if (!user) return false;
      if (user.permissions.editAllServices) return true;
      if (user.permissions.editOwnServices && isOwnService(user, service)) return true;
      return false;
    },
    [user],
  );

  const canDeleteService = useCallback(
    (_service: { chofer?: string; custodio?: string }) => {
      if (!user) return false;
      return user.permissions.deleteServices;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, ready, login, logout, refresh, can, canEditService, canDeleteService }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
