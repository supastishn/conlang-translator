import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      await authService.login(email, password);
      await checkAuthStatus();
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const register = async (email, password) => {
    try {
      await authService.register(email, password);
      await checkAuthStatus();
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateEmail: authService.updateEmail,
    updatePassword: authService.updatePassword,
    deleteAccount: authService.deleteAccount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
