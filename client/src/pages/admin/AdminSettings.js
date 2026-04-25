import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// eslint-disable-next-line no-unused-vars

import axios from '../../api';
import './AdminSettings.css';

const AdminSettings = () => {
  const { user, updateAdminProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [settingsData, setSettingsData] = useState({
    newUsername: '',
    newEmail: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate passwords match if provided
    if (settingsData.password || settingsData.confirmPassword) {
      if (settingsData.password !== settingsData.confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        setLoading(false);
        return;
      }

      if (settingsData.password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        setLoading(false);
        return;
      }
    }

    // Validate email format if provided
    if (settingsData.newEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settingsData.newEmail)) {
        setMessage({ type: 'error', text: 'Invalid email format' });
        setLoading(false);
        return;
      }
    }

    // Prepare the update data
    const updateData = {};
    
    if (settingsData.newUsername && settingsData.newUsername !== user?.username) {
      updateData.username = settingsData.newUsername;
    }
    
    if (settingsData.newEmail && settingsData.newEmail !== user?.email) {
      updateData.email = settingsData.newEmail;
    }
    
    if (settingsData.password) {
      updateData.password = settingsData.password;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      setMessage({ type: 'error', text: 'No changes to update' });
      setLoading(false);
      return;
    }

    try {
      const result = await updateAdminProfile(updateData);

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        
        // Clear the form
        setSettingsData({
          newUsername: '',
          newEmail: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update settings' });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update settings';
      setMessage({ type: 'error', text: errorMessage });
    }
    setLoading(false);
  };

  return (
    <div className="admin-settings">
      <div className="container">
        <div className="page-header">
          <h1>Admin Settings</h1>
          <p>Update your profile information</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-container">
          <div className="settings-form">
            <h3>Account Settings</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Current Username</label>
                <input 
                  type="text" 
                  value={user?.username || ''} 
                  disabled 
                  className="input-disabled"
                />
                <span className="help-text">Your current username</span>
              </div>

              <div className="form-group">
                <label>New Username</label>
                <input 
                  type="text" 
                  value={settingsData.newUsername}
                  onChange={(e) => setSettingsData({...settingsData, newUsername: e.target.value})}
                  placeholder="Enter new username (leave blank to keep current)"
                />
              </div>

              <div className="form-group">
                <label>Current Email</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="input-disabled"
                />
                <span className="help-text">Your current email</span>
              </div>

              <div className="form-group">
                <label>New Email</label>
                <input 
                  type="email" 
                  value={settingsData.newEmail}
                  onChange={(e) => setSettingsData({...settingsData, newEmail: e.target.value})}
                  placeholder="Enter new email (leave blank to keep current)"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input 
                  type="text" 
                  value={user?.isAdmin ? 'Admin' : ''} 
                  disabled 
                  className="input-disabled"
                />
              </div>

              <div className="form-divider">
                <span>Change Password (optional)</span>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={settingsData.password}
                  onChange={(e) => setSettingsData({...settingsData, password: e.target.value})}
                  placeholder="Enter new password"
                  minLength="6"
                  name="password"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={settingsData.confirmPassword}
                  onChange={(e) => setSettingsData({...settingsData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  name="confirmPassword"
                  autoComplete="new-password"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

