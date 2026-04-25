import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Store token in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Store user in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        try {
          const response = await axios.get('/users/profile');
          setUser(response.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // User login
  const login = async (email, password) => {
    try {
      const response = await axios.post('/users/login', { 
        username: email.includes('@') ? undefined : email,
        email: email.includes('@') ? email : undefined, 
        password 
      });
      
      setToken(response.data.token);
      setUser(response.data.user);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  // Admin login (backend returns flat: { _id, username, isAdmin, token })
  const adminLogin = async (username, password) => {
    try {
      const response = await axios.post('/admin/login', { username, password });
      const { token: adminToken, ...adminUser } = response.data;
      setToken(adminToken);
      setUser(adminUser);
      return { success: true, message: 'Admin login successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Admin login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/users/register', userData);
      setToken(response.data.token);
      setUser(response.data.user);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUserProfile = async (data) => {
    try {
      const response = await axios.put('/users/profile', data);
      setUser(response.data.user);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Update failed' 
      };
    }
  };

  const updateAdminProfile = async (data) => {
    try {
      const response = await axios.put('/admin/update-credentials', data);
      // Merge updated fields into current user object
      setUser(prev => ({ ...prev, ...response.data.admin }));
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Update failed' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    login,
    adminLogin,
    register,
    logout,
    updateUserProfile,
    updateAdminProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

