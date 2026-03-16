import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? '/api'
    : 'http://localhost:3004/api');

const clearAuthStorage = () => {
  localStorage.removeItem('rider_token');
  localStorage.removeItem('rider_data');
};

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rider_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    const shouldResetSession =
      status === 401 ||
      (status === 404 && /rider not found/i.test(message));

    if (shouldResetSession) {
      clearAuthStorage();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }) {
  const [rider, setRider] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('rider_token');
    const savedRider = localStorage.getItem('rider_data');

    const validateSession = async () => {
      if (!savedToken || !savedRider) {
        setLoading(false);
        return;
      }

      setToken(savedToken);
      setRider(JSON.parse(savedRider));

      try {
        const { data } = await api.get('/rider/profile');
        if (data?.success && data?.rider) {
          setRider(data.rider);
          localStorage.setItem('rider_data', JSON.stringify(data.rider));
        }
      } catch (_err) {
        setToken(null);
        setRider(null);
        clearAuthStorage();
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/rider/login', { email, password });
    if (data.success) {
      setToken(data.token);
      setRider(data.rider);
      localStorage.setItem('rider_token', data.token);
      localStorage.setItem('rider_data', JSON.stringify(data.rider));
    }
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/rider/register', userData);
    if (data.success) {
      setToken(data.token);
      setRider(data.rider);
      localStorage.setItem('rider_token', data.token);
      localStorage.setItem('rider_data', JSON.stringify(data.rider));
    }
    return data;
  };

  const logout = () => {
    setToken(null);
    setRider(null);
    clearAuthStorage();
  };

  const updateRider = (updatedRider) => {
    setRider(updatedRider);
    localStorage.setItem('rider_data', JSON.stringify(updatedRider));
  };

  return (
    <AuthContext.Provider value={{ rider, token, loading, login, register, logout, updateRider }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { api };
export default AuthContext;
