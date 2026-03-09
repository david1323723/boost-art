import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminComments.css';

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const response = await axios.get('/api/admin/comments');
      setComments(response.data);
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId, commentId) => {
    try {
      await axios.delete(`/api/admin/posts/${postId}/comments/${commentId}`);
      setComments(comments.filter(c => c._id !== commentId));
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredComments = filter === 'all' 
    ? comments 
    : comments.filter(c => c.postTitle.toLowerCase().includes(filter.toLowerCase()));

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="admin-comments">
      <div className="container">
        <div className="page-header">
          <h1>Comments Moderation</h1>
          <p>Review and manage user comments</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="comments-filter">
          <input
            type="text"
            placeholder="Search by post title..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
          <span className="comment-count">
            {filteredComments.length} comment{filteredComments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredComments.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>No comments found</h3>
            <p>Comments will appear here when users post them</p>
          </div>
        ) : (
          <div className="comments-list">
            {filteredComments.map((comment) => (
              <div key={comment._id} className="comment-card">
                <div className="comment-header">
                  <div className="comment-meta">
                    <span className="comment-author">{comment.username}</span>
                    <span className="comment-date">{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className="comment-post">
                    <Link to={`/post/${comment.postId}`} className="post-link">
                      On: {comment.postTitle}
                    </Link>
                  </div>
                </div>
                <div className="comment-body">
                  <p>{comment.message}</p>
                </div>
                <div className="comment-actions">
                  <Link to={`/post/${comment.postId}`} className="btn btn-outline btn-sm">
                    View Post
                  </Link>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(comment.postId, comment._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminComments;

