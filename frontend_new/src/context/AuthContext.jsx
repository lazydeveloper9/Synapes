import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('df_user');
    const token = localStorage.getItem('df_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('df_token');
        localStorage.removeItem('df_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('df_token', data.token);
    localStorage.setItem('df_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('df_token', data.token);
    localStorage.setItem('df_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('df_token');
    localStorage.removeItem('df_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);