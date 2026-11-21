import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { authAPI } from "../services/api";
import { apiError } from "../constants/locale";

export function useAuth() {
  const { user, token, setAuth, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (email, password) => {
      try {
        const { data } = await authAPI.login({ email, password });
        setAuth(data.user, data.access_token, data.refresh_token);
        toast.success(`Bienvenue, ${data.user.first_name} !`);
        navigate("/tableau-de-bord");
        return { success: true };
      } catch (err) {
        const msg = err.response?.status === 401 ? "Email ou mot de passe incorrect" : apiError(err, "Connexion impossible, réessayez dans un instant");
        return { success: false, error: msg };
      }
    },
    [setAuth, navigate]
  );

  const register = useCallback(
    async (formData) => {
      try {
        await authAPI.register(formData);
        // Connexion automatique : l'utilisateur arrive directement sur son tableau de bord.
        let data;
        try {
          ({ data } = await authAPI.login({ email: formData.email, password: formData.password }));
        } catch {
          // Compte bien créé mais connexion refusée (ex. trop de tentatives) : on l'envoie se connecter.
          toast.success("Compte créé ! Connectez-vous pour continuer.");
          navigate("/connexion");
          return { success: true };
        }
        setAuth(data.user, data.access_token, data.refresh_token);
        toast.success(`Bienvenue sur ProServices, ${data.user.first_name} !`);
        // Différé : la route /inscription redirige aussitôt un utilisateur connecté vers le tableau de bord ;
        // on passe après cette redirection pour envoyer le professionnel compléter son profil.
        const dest = data.user.role === "PROFESSIONAL" ? "/profil/modifier" : "/tableau-de-bord";
        setTimeout(() => navigate(dest, { replace: true }), 0);
        return { success: true };
      } catch (err) {
        const msg = apiError(err, "Inscription impossible, réessayez dans un instant");
        return { success: false, error: msg };
      }
    },
    [setAuth, navigate]
  );

  const logout = useCallback(() => {
    storeLogout();
    navigate("/");
    toast.success("Déconnexion réussie");
  }, [storeLogout, navigate]);

  return { user, token, login, register, logout, isAuthenticated: !!token };
}
