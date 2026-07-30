import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    api.auth.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const data = await api.auth.google(idToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await api.auth.register(userData);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);

  // Called after successful onboarding to flip the flag
  const markOnboarded = useCallback(() => {
    setUser((prev) => prev ? { ...prev, onboarded: 1 } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, markOnboarded }}>
      {children}
    </AuthContext.Provider>
  );
}

// TODO: ใส่ AuthProvider กลับใน App.jsx เมื่อต้องการระบบ login จริง
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  // ถ้าไม่มี AuthProvider (ระบบ auth ถูกปิดชั่วคราว) ให้ return guest
  if (!ctx) return { user: null, loading: false, login: null, loginWithGoogle: null, register: null, logout: null, markOnboarded: null };
  return ctx;
};
