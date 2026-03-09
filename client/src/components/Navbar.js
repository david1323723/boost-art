import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

// Sun icon for light mode
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

// Moon icon for dark mode
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Navbar = () => {
  const { user, admin, isAuthenticated, isAdmin, logout, adminLogout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAdminLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  // Don't show navbar on admin login page
  if (location.pathname === '/admin/login') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="Boost Art Designer Logo" className="site-logo" />
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="navbar-item">Gallery</Link>
          
          {isAdmin ? (
            <>
              <Link to="/admin" className="navbar-item">Dashboard</Link>
              <Link to="/admin/upload" className="navbar-item">Upload</Link>
              <Link to="/admin/posts" className="navbar-item">Posts</Link>
              <Link to="/admin/messages" className="navbar-item">Messages</Link>
              <Link to="/admin/settings" className="navbar-item">Settings</Link>
              <div className="navbar-actions">
                <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
                <div className="navbar-user">
                  <span className="user-name">Admin: {admin?.username}</span>
                  <button onClick={handleAdminLogout} className="btn btn-sm btn-outline">
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {isAuthenticated && (
                <>
                  <Link to="/messages" className="navbar-item">Messages</Link>
                  <div className="navbar-actions">
                    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
                    <div className="navbar-user">
                      <Link to="/settings" className="user-profile">
                        <span className="user-name">{user?.username}</span>
                      </Link>
                      <button onClick={handleLogout} className="btn btn-sm btn-outline">
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {!isAuthenticated && (
                <div className="navbar-actions">
                  <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                  </button>
                  <div className="navbar-auth">
                    <Link to="/login" className="btn btn-sm btn-outline">Login</Link>
                    <Link to="/register" className="btn btn-sm btn-primary">Register</Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

