import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) => set({ user, token, refreshToken }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),

      logout: () => {
        set({ user: null, token: null, refreshToken: null });
      },

      isAuthenticated: () => !!get().token,
      isAdmin: () => ["ADMIN", "SUPER_ADMIN"].includes(get().user?.role),
      isProfessional: () => get().user?.role === "PROFESSIONAL",
      isClient: () => get().user?.role === "CLIENT",
    }),
    {
      name: "proservices-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
