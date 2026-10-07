import { API_BASE_URL } from "../lib/api";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface PendingRegistrationResponse {
  email: string;
  message: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  nationality?: string;
  countryOfResidence?: string;
  preferences?: string;
  languages?: string[];
  termsAccepted?: boolean;
}

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("voyara_token");
  const shouldAttachToken = token && path === "/auth/me";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(shouldAttachToken ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem("voyara_user");
      sessionStorage.removeItem("voyara_token");
    }
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export const authService = {
  login: (email: string, password: string) =>
    authRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (payload: RegisterPayload) =>
    authRequest<PendingRegistrationResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  verifyEmail: (email: string, code: string) =>
    authRequest<AuthResponse>("/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) }),

  resendVerificationCode: (email: string) =>
    authRequest<PendingRegistrationResponse>("/auth/resend-verification-code", { method: "POST", body: JSON.stringify({ email }) }),

  me: () => authRequest<AuthUser>("/auth/me"),
};
