import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  department: string;
  role: string;
  level?: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  requirePasswordChange: boolean;

  loginSystem: string;
  setAuth: (token: string, user: User, requirePasswordChange: boolean, loginSystem?: string) => void;
  logout: () => void;

}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      requirePasswordChange: false,

      loginSystem: '1',
      setAuth: (token, user, requirePasswordChange, loginSystem = '1') => set({ token, user, requirePasswordChange, loginSystem }),
      logout: () => set({ token: null, user: null, requirePasswordChange: false, loginSystem: '1' }),

    }),
    {
      name: 'auth-storage',
    }
  )
);
