import { create } from "zustand";

type AuthUser = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (payload: { token: string; user: AuthUser }) => void;
  clearAuth: () => void;
};

const initialToken = localStorage.getItem("access_token");
const initialUserRaw = localStorage.getItem("auth_user");
let initialUser: AuthUser | null = null;
if (initialUserRaw) {
  try {
    initialUser = JSON.parse(initialUserRaw) as AuthUser;
  } catch {
    initialUser = null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser,
  isAuthenticated: Boolean(initialToken),
  setAuth: ({ token, user }) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
