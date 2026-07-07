import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [guestSessionId, setGuestSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedGuestId = localStorage.getItem('guestSessionId');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else if (savedGuestId) {
      setGuestSessionId(savedGuestId);
    }
    setLoading(false);
  }, []);

  // Login or auto-register
  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Login failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    setGuestSessionId(null);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.removeItem('guestSessionId');
    return data.user;
  }, []);

  // Guest access
  const continueAsGuest = useCallback(async () => {
    const res = await fetch('/api/auth/guest-session', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start guest session');
    const data = await res.json();
    setGuestSessionId(data.session_id);
    setToken(null);
    setUser(null);
    localStorage.setItem('guestSessionId', data.session_id);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return data.session_id;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
      }
    } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    setGuestSessionId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('guestSessionId');
  }, [token]);

  // Build the right headers for every API call
  const getAuthHeaders = useCallback(() => {
    if (token) return { Authorization: `Bearer ${token}` };
    if (guestSessionId) return { 'X-Guest-Session-ID': guestSessionId };
    return {};
  }, [token, guestSessionId]);

  const authFetch = useCallback((url, options = {}) => {
    const headers = { ...options.headers, ...getAuthHeaders() };
    return fetch(url, { ...options, headers }).then(async (res) => {
      if (res.status === 401 && token) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return res;
    });
  }, [token, guestSessionId, getAuthHeaders]);

  const isAuthenticated = !!token || !!guestSessionId;
  const isGuest = !token && !!guestSessionId;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user, token, guestSessionId, loading,
      isAuthenticated, isGuest, isAdmin,
      login, continueAsGuest, logout, authFetch, getAuthHeaders,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
