import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [loading, setLoading] = useState(true);

  // Configure axios headers based on which is currently active
  useEffect(() => {
    // Priority: admin token > user token
    if (adminToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    } else if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token, adminToken]);

  // Store tokens in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('adminToken', adminToken);
    } else {
      localStorage.removeItem('adminToken');
    }
  }, [adminToken]);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check admin first (higher priority)
      if (adminToken) {
        try {
          // For hardcoded admin token
          if (adminToken.startsWith('admin-token-')) {
            const storedAdmin = localStorage.getItem('admin');
            if (storedAdmin) {
              setAdmin(JSON.parse(storedAdmin));
            } else {
              setAdminToken(null);
            }
          } else {
            // For database admin
            const response = await axios.get('/api/admin/profile');
            setAdmin(response.data);
          }
        } catch (error) {
          console.error('Admin auth check failed:', error);
          setAdminToken(null);
        }
      }
      
      // Then check user
      if (token) {
        try {
          const response = await axios.get('/api/users/profile');
          setUser(response.data);
        } catch (error) {
          console.error('User auth check failed:', error);
          setToken(null);
        }
      }
      
      setLoading(false);
    };
    checkAuth();
  }, []);

  // User functions
  const login = async (email, password) => {
    try {
      // Clear any existing admin session first
      setAdminToken(null);
      setAdmin(null);
      
      const response = await axios.post('/api/users/login', { 
        username: email.includes('@') ? undefined : email,
        email: email.includes('@') ? email : undefined, 
        password 
      });
      
      // Check if it's an admin response
      if (response.data.role === 'admin' || response.data.admin) {
        const adminData = response.data.admin || {
          id: 'admin-001',
          username: 'david',
          email: 'david@boostart.com',
          fullName: 'David',
          role: 'admin'
        };
        const fakeToken = 'admin-token-' + Date.now();
        setAdminToken(fakeToken);
        setAdmin(adminData);
        localStorage.setItem('admin', JSON.stringify(adminData));
        return { success: true, message: response.data.message };
      }
      
      // Regular user login
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

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/users/register', userData);
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
      const response = await axios.put('/api/users/profile', data);
      setUser(response.data.user);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Update failed' 
      };
    }
  };

  // Admin functions
  const adminLogin = async (email, password) => {
    try {
      // Clear any existing user session first
      setToken(null);
      setUser(null);
      
      const response = await axios.post('/api/admin/login', { email, password });
      setAdminToken(response.data.token);
      setAdmin(response.data.admin);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Admin login failed' 
      };
    }
  };

  const adminLogout = () => {
    setAdminToken(null);
    setAdmin(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
  };

  const updateAdminProfile = async (data) => {
    try {
      const response = await axios.put('/api/admin/profile', data);
      setAdmin(response.data.admin);
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
    admin,
    token,
    adminToken,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!admin,
    login,
    register,
    logout,
    updateUserProfile,
    adminLogin,
    adminLogout,
    updateAdminProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

