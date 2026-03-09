import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminManagePosts.css';

const AdminManagePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: ''
  });
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/admin/posts');
      setPosts(response.data);
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`/api/admin/posts/${postId}`);
      setPosts(posts.filter(post => post._id !== postId));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete post');
    }
  };

  const handleEditClick = (post) => {
    setEditingPost(post);
    setEditFormData({
      title: post.title,
      description: post.description || '',
      category: post.category
    });
    setEditFile(null);
    setEditPreview(null);
  };

  const handleEditFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    setEditFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setEditPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      setEditPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', editFormData.title);
      data.append('description', editFormData.description);
      data.append('category', editFormData.category);

      if (editFile) {
        data.append('media', editFile);
      }

      const response = await axios.put(`/api/admin/posts/${editingPost._id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update posts list with updated post
      setPosts(posts.map(post => 
        post._id === editingPost._id ? response.data.post : post
      ));

      setEditingPost(null);
      setEditFormData({ title: '', description: '', category: '' });
      setEditFile(null);
      setEditPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditFormData({ title: '', description: '', category: '' });
    setEditFile(null);
    setEditPreview(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const categories = [
    { value: 'Graphic Design', label: 'Graphic Design' },
    { value: 'Photography', label: 'Photography' },
    { value: 'Video Production', label: 'Video Production' },
    { value: 'Advertising', label: 'Advertising' }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="admin-manage-posts">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Manage Posts</h1>
            <p>View, edit or delete gallery content</p>
          </div>
          <Link to="/admin/upload" className="btn btn-primary">
            Upload New
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {posts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3>No posts yet</h3>
            <p>Upload your first post to get started</p>
            <Link to="/admin/upload" className="btn btn-primary">Upload Content</Link>
          </div>
        ) : (
          <div className="posts-table">
            <table>
              <thead>
                <tr>
                  <th>Media</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post._id}>
                    <td>
                      <div className="post-thumbnail">
                        {post.mediaType === 'video' ? (
                          <video src={post.mediaUrl} />
                        ) : (
                          <img src={post.mediaUrl} alt={post.title} />
                        )}
                        <span className="media-badge">{post.mediaType}</span>
                      </div>
                    </td>
                    <td>
                      <div className="post-title">{post.title}</div>
                      {post.description && (
                        <div className="post-description">
                          {post.description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="category-badge">{post.category}</span>
                    </td>
                    <td>
                      <span className="uploaded-by">{post.uploadedByName || 'Admin'}</span>
                    </td>
                    <td>{formatDate(post.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/post/${post._id}`} className="btn-icon" title="View">
                          👁
                        </Link>
                        <button 
                          className="btn-icon edit"
                          onClick={() => handleEditClick(post)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {deleteConfirm === post._id ? (
                          <div className="delete-confirm">
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(post._id)}
                            >
                              Confirm
                            </button>
                            <button 
                              className="btn btn-sm btn-outline"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn-icon delete"
                            onClick={() => setDeleteConfirm(post._id)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Post</h2>
              <button className="modal-close" onClick={cancelEdit}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="edit-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
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
                <label>Replace Media (optional)</label>
                <input
                  type="file"
                  onChange={handleEditFileChange}
                  accept="image/*,video/*"
                />
                {editPreview ? (
                  <div className="edit-preview">
                    {editFile?.type?.startsWith('video/') ? (
                      <video src={editPreview} controls />
                    ) : (
                      <img src={editPreview} alt="Preview" />
                    )}
                  </div>
                ) : (
                  <div className="current-media">
                    <p>Current media:</p>
                    {editingPost.mediaType === 'video' ? (
                      <video src={editingPost.mediaUrl} controls />
                    ) : (
                      <img src={editingPost.mediaUrl} alt="Current" />
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagePosts;

