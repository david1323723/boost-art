import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminUpload.css';

const AdminUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    mediaType: 'image'
  });

  const [file, setFile] = useState(null);

  const categories = [
    { value: '', label: 'Select Category' },
    { value: 'Graphic Design', label: 'Graphic Design' },
    { value: 'Photography', label: 'Photography' },
    { value: 'Video Production', label: 'Video Production' },
    { value: 'Advertising', label: 'Advertising' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file size (100MB max)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Create preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
      setFormData({ ...formData, mediaType: 'image' });
    } else if (selectedFile.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(selectedFile));
      setFormData({ ...formData, mediaType: 'video' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formData.title || !formData.category) {
      setError('Title and category are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('mediaType', formData.mediaType);
      data.append('media', file);

      await axios.post('/api/admin/posts', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Content uploaded successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        mediaType: 'image'
      });
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Navigate to posts page after success
      setTimeout(() => {
        navigate('/admin/posts');
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload content');
    } finally {
      setLoading(false);
    }
  };

  const removePreview = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="admin-upload">
      <div className="container">
        <div className="page-header">
          <h1>Upload Content</h1>
          <p>Add new images or videos to the gallery</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="upload-container">
          <form onSubmit={handleSubmit} className="upload-form">
            {/* File Upload Area */}
            <div className="form-section">
              <h3>Media File</h3>
              <div 
                className={`file-upload-area ${preview ? 'has-preview' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <div className="preview-container">
                    {formData.mediaType === 'video' ? (
                      <video src={preview} controls />
                    ) : (
                      <img src={preview} alt="Preview" />
                    )}
                    <button 
                      type="button" 
                      className="remove-preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePreview();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p>Click to upload image or video</p>
                    <span>Max size: 100MB</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="form-section">
              <h3>Content Details</h3>
              
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description (optional)"
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Media Type</label>
                <div className="media-type-options">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="mediaType"
                      value="image"
                      checked={formData.mediaType === 'image'}
                      onChange={handleChange}
                    />
                    <span>Image</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="mediaType"
                      value="video"
                      checked={formData.mediaType === 'video'}
                      onChange={handleChange}
                    />
                    <span>Video</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => navigate('/admin')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Upload Content'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUpload;

