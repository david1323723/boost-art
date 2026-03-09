import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../api';
import './UserSettings.css';

const UserSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const result = await updateUserProfile(profileData);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.put('/api/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      const data = response.data;

      if (data.message) {
        setMessage({ type: 'success', text: data.message });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to change password' });
    }
    setLoading(false);
  };

  return (
    <div className="user-settings-page">
      <div className="container">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Manage your account settings</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-container">
          {/* Tabs */}
          <div className="settings-tabs">
            <button 
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button 
              className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              Change Password
            </button>
          </div>

          {/* Tab Content */}
          <div className="settings-content">
            {activeTab === 'profile' && (
              <div className="tab-panel">
                <h3>Profile Settings</h3>
                <form onSubmit={handleProfileSubmit}>
                  <div className="form-group">
                    <label>Username</label>
                    <input 
                      type="text" 
                      value={user?.username || ''} 
                      disabled 
                      className="input-disabled"
                    />
                    <span className="help-text">Username cannot be changed</span>
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled 
                      className="input-disabled"
                    />
                    <span className="help-text">Email cannot be changed</span>
                  </div>

                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bio</label>
                    <textarea 
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      placeholder="Tell us about yourself..."
                      rows="4"
                      maxLength="200"
                    />
                    <span className="help-text">{profileData.bio?.length || 0}/200 characters</span>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="tab-panel">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input 
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="Enter current password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input 
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="Enter new password"
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;

