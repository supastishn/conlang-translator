import { createContext, useContext, useState, useEffect } from 'react';
import { Client, Account } from 'appwrite';

const AuthContext = createContext();

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('draconic-translator');

const account = new Account(client);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = async () => {
    try {
      return await account.get();
    } catch {
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
      const user = await getCurrentUser();
      setUser(user);
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

  const value = { 
    user, 
    loading,
    login,
    register,
    logout,
    updateEmail,
    updatePassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
