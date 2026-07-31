import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const USER_CACHE_KEY = 'thaitrail_auth_user';

function loadCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUserCache(user) {
  try {
    if (user) {
      const rest = { ...user };
      // ไม่บันทึก avatar_url (ถ้าเป็น base64 ขนาดใหญ่) แต่ถ้าเป็น URL ปกติ (เช่น Google) บันทึกได้
      if (rest.avatar_url && rest.avatar_url.startsWith('data:')) {
        delete rest.avatar_url;
      }
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(rest));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // quota exceeded — ไม่ต้อง crash
  }
}

export function AuthProvider({ children }) {
  // ใช้ cached user เป็นค่าตั้งต้น ป้องกันการกระพริบเป็น "เข้าสู่ระบบ" ตอน refresh
  const [user, setUser] = useState(() => loadCachedUser());
  const [loading, setLoading] = useState(true);

  const setAndCacheUser = useCallback((u) => {
    setUser(u);
    saveUserCache(u);
  }, []);

  // Check session on mount — verify with backend
  useEffect(() => {
    api.auth.me()
      .then((data) => setAndCacheUser(data.user))
      .catch(() => {
        // me() failed (PHP session อาจหายผ่าน dev proxy)
        // ถ้ามี cached user ให้คงไว้ — user ยังเห็นตัวเองเป็น login อยู่
        // จะ clear เฉพาะตอนที่ user กด logout เองเท่านั้น
        const cached = loadCachedUser();
        if (!cached) {
          setUser(null); // ไม่มี cache = ยังไม่เคย login
        }
        // ถ้ามี cache → setUser ยังเป็น cached user จาก useState init อยู่แล้ว ไม่ต้องทำอะไร
      })
      .finally(() => setLoading(false));
  }, [setAndCacheUser]);

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials);
    setAndCacheUser(data.user);
    return data.user;
  }, [setAndCacheUser]);

  const loginWithGoogle = useCallback(async (idToken) => {
    const data = await api.auth.google(idToken);
    setAndCacheUser(data.user);
    return data.user;
  }, [setAndCacheUser]);

  const register = useCallback(async (userData) => {
    const data = await api.auth.register(userData);
    setAndCacheUser(data.user);
    return data.user;
  }, [setAndCacheUser]);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    setUser(null);
    saveUserCache(null);
  }, []);

  // Called after successful onboarding to flip the flag
  const markOnboarded = useCallback(() => {
    setUser((prev) => {
      const next = prev ? { ...prev, onboarded: 1 } : prev;
      saveUserCache(next);
      return next;
    });
  }, []);

  // Called after profile update — sync name into cache too
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...updatedFields } : updatedFields;
      saveUserCache(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, markOnboarded, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) return { user: null, loading: false, login: null, loginWithGoogle: null, register: null, logout: null, markOnboarded: null, updateUser: null };
  return ctx;
};
