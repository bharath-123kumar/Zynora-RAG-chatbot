import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('zynora_token') || null);
  const [loading, setLoading] = useState(true);
  // Prevent re-entrant / recursive logout calls
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token && !isLoggingOut.current) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data.user);
        } catch (err) {
          // Token is invalid/expired — clear it silently without calling /logout
          // (calling authAPI.logout here would race with the cleared token)
          localStorage.removeItem('zynora_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('zynora_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role) => {
    const response = await authAPI.register({ email, password, name, role });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('zynora_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try {
      if (token) await authAPI.logout();
    } catch (e) {
      console.warn('Logout notification error:', e);
    } finally {
      localStorage.removeItem('zynora_token');
      setToken(null);
      setUser(null);
      isLoggingOut.current = false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'ADMIN'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
