import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalComments: 0,
    totalMessages: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Posts',
      value: stats.totalPosts,
      icon: '📸',
      link: '/admin/posts',
      color: '#6C63FF'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      link: '/admin/settings',
      color: '#00B894'
    },
    {
      title: 'Total Comments',
      value: stats.totalComments,
      icon: '💬',
      link: '/admin/comments',
      color: '#FDCB6E'
    },
    {
      title: 'Messages',
      value: stats.totalMessages,
      icon: '✉️',
      subValue: `${stats.unreadMessages} unread`,
      link: '/messages',
      color: '#FF6B6B'
    }
  ];

  const quickActions = [
    {
      title: 'Upload New Content',
      description: 'Add new images or videos to the gallery',
      icon: '➕',
      link: '/admin/upload',
      btnText: 'Upload'
    },
    {
      title: 'Manage Posts',
      description: 'Edit or delete existing posts',
      icon: '📝',
      link: '/admin/posts',
      btnText: 'Manage'
    },
    {
      title: 'Moderate Comments',
      description: 'Review and manage user comments',
      icon: '💬',
      link: '/admin/comments',
      btnText: 'View'
    },
    {
      title: 'View Messages',
      description: 'Check messages from users',
      icon: '📨',
      link: '/messages',
      btnText: 'View'
    }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="page-header">
          <div className="header-logo">
            <img src="/logo.png" alt="Boost Art Designer Logo" className="site-logo" />
          </div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.fullName || user?.username}</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {statCards.map((stat, index) => (
            <Link to={stat.link} key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
                <span>{stat.icon}</span>
              </div>
              <div className="stat-info">
                <h3>{stat.title}</h3>
                <div className="stat-value">{stat.value}</div>
                {stat.subValue && <div className="stat-sub">{stat.subValue}</div>}
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <div key={index} className="action-card">
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
                <Link to={action.link} className="btn btn-primary">
                  {action.btnText}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Info */}
        <div className="admin-info">
          <div className="info-card">
            <h3>Admin Information</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">{user?.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value badge badge-primary">{user?.isAdmin ? 'Admin' : ''}</span>
              </div>
            </div>
            <Link to="/admin/settings" className="btn btn-outline mt-2">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

