import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authService, type AuthUser, type RegisterPayload } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  authError: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  signup: (name: string, email: string, password: string, profile?: Pick<RegisterPayload, "phone" | "nationality" | "countryOfResidence" | "languages" | "termsAccepted">) => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function loadUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem("voyara_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAuth(user: AuthUser, token?: string) {
  sessionStorage.setItem("voyara_user", JSON.stringify(user));
  if (token) sessionStorage.setItem("voyara_token", token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const refreshUser = async () => {
    const token = sessionStorage.getItem("voyara_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authService.me();
      setUser(currentUser);
      persistAuth(currentUser);
    } catch {
      sessionStorage.removeItem("voyara_user");
      sessionStorage.removeItem("voyara_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    const clearExpiredAuth = () => setUser(null);
    window.addEventListener("voyara:auth-expired", clearExpiredAuth);
    return () => window.removeEventListener("voyara:auth-expired", clearExpiredAuth);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError("");
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      persistAuth(response.user, response.token);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication request failed");
      return false;
    }
  };

  const register = async (payload: RegisterPayload): Promise<boolean> => {
    setAuthError("");
    try {
      await authService.register(payload);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication request failed");
      return false;
    }
  };

  const signup = (name: string, email: string, password: string, profile?: Pick<RegisterPayload, "phone" | "nationality" | "countryOfResidence" | "languages" | "termsAccepted">): Promise<boolean> =>
    register({ fullName: name, email, password, ...profile });

  const verifyEmail = async (email: string, code: string): Promise<boolean> => {
    setAuthError("");
    try {
      const response = await authService.verifyEmail(email, code);
      setUser(response.user);
      persistAuth(response.user, response.token);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication request failed");
      return false;
    }
  };

  const resendVerificationCode = async (email: string): Promise<boolean> => {
    setAuthError("");
    try {
      await authService.resendVerificationCode(email);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication request failed");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("voyara_user");
    sessionStorage.removeItem("voyara_token");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, loading, user, authError, login, register, signup, verifyEmail, resendVerificationCode, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
