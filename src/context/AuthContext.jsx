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
import { createContext, useContext, useState, useEffect } from 'react';
import { Client, Account } from 'appwrite';

const AuthContext = createContext();
const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('draconic-translator');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const account = new Account(client);

  const getCurrentUser = async () => {
    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await getCurrentUser();
      setUser(user);
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error('Authentication failed. Check credentials and try again.');
    }
  };

  const register = async (email, password) => {
    try {
      await account.create('unique()', email, password);
      return await login(email, password);
    } catch (error) {
      console.error("Registration failed:", error);
      throw new Error('Registration failed. Please check your input and try again.');
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw new Error('Logout failed. Please try again.');
    }
  };

  const updateEmail = async (newEmail, password) => {
    try {
      await account.updateEmail(newEmail, password);
      setUser({ ...user, email: newEmail });
    } catch (error) {
      console.error("Email update failed:", error);
      throw new Error('Failed to update email. Please check your password and try again.');
    }
  };

  const updatePassword = async (oldPassword, newPassword) => {
    try {
      await account.updatePassword(newPassword, oldPassword);
    } catch (error) {
      console.error("Password update failed:", error);
      throw new Error('Failed to update password. Please check your credentials and try again.');
    }
  };

  const deleteAccount = async () => {
    try {
      await account.delete();
      setUser(null);
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw new Error('Failed to delete account. Please try again.');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      getCurrentUser,
      login,
      register,
      logout,
      updateEmail,
      updatePassword,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
