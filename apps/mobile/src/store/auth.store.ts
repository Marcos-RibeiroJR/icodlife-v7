// apps/mobile/src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string; email: string; fullName: string;
  gender: 'male' | 'female' | 'other';
  bloodType: string; status: string; avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, at: string, rt: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null, refreshToken: null, isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'icodlife-auth', storage: createJSONStorage(() => AsyncStorage) }
  )
);
