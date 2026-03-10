import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const UserLogin = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check for admin credentials first (client-side check)
      if (formData.username === 'david' && formData.password === '0791323723') {
        // Admin login - create admin session
        const adminData = {
          id: 'admin-001',
          username: 'david',
          email: 'david@boostart.com',
          fullName: 'David',
          role: 'admin'
        };
        const fakeToken = 'admin-token-' + Date.now();
        localStorage.setItem('adminToken', fakeToken);
        localStorage.setItem('admin', JSON.stringify(adminData));
        
        // Use window.location for full reload to ensure AuthContext is re-initialized
        window.location.href = '/admin/dashboard';
        return;
      }

      // Regular user login - use the login function from AuthContext
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        // Check if response indicates admin (from backend)
        const adminData = localStorage.getItem('admin');
        if (adminData) {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/';
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      // If API call fails, check if it was the hardcoded admin
      if (formData.username === 'david' && formData.password === '0791323723') {
        // Admin login
        const adminData = {
          id: 'admin-001',
          username: 'david',
          email: 'david@boostart.com',
          fullName: 'David',
          role: 'admin'
        };
        const fakeToken = 'admin-token-' + Date.now();
        localStorage.setItem('adminToken', fakeToken);
        localStorage.setItem('admin', JSON.stringify(adminData));
        window.location.href = '/admin/dashboard';
      } else {
        setError(err.response?.data?.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/logo.png" alt="Boost Art Designer Logo" className="site-logo" />
            </div>
            <h1>Welcome Back</h1>
            <p>Login to your account</p>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username or Email</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username or email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account? 
              <Link to="/register"> Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;

