import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './PostDetails.css';

const PostDetails = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [deletingComment, setDeletingComment] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/posts/${id}`);
        if (isMounted) {
          setPost(response.data);
          setError('');
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        if (isMounted) {
          setError('Failed to load post. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setCommentError('Please login to comment');
      return;
    }

    if (!comment.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      setCommentError('');
      const response = await axios.post(`/api/users/posts/${id}/comments`, {
        message: comment
      });
      
      // Add new comment to post
      setPost(prev => ({
        ...prev,
        comments: [...prev.comments, response.data.comment]
      }));
      
      setComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setCommentError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setDeletingComment(commentId);
      await axios.delete(`/api/users/posts/${id}/comments/${commentId}`);
      
      setPost(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c._id !== commentId)
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert(err.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-details-page">
        <div className="container">
          <div className="alert alert-error">
            {error || 'Post not found'}
          </div>
          <Link to="/" className="btn btn-primary">Back to Gallery</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="post-details-page">
      <div className="container">
        <Link to="/" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Gallery
        </Link>

        <div className="post-details">
          {/* Media Section */}
          <div className="post-media">
            {post.mediaType === 'video' ? (
              <video 
                src={post.mediaUrl} 
                controls
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img src={post.mediaUrl} alt={post.title} />
            )}
          </div>

          {/* Content Section */}
          <div className="post-content">
            <div className="post-header">
              <span className="post-category">{post.category}</span>
              <h1>{post.title}</h1>
              <p className="post-date">Posted on {formatDate(post.createdAt)}</p>
            </div>

            {post.description && (
              <div className="post-description">
                <p>{post.description}</p>
              </div>
            )}

            {/* Comments Section */}
            <div className="comments-section">
              <h3>
                Comments 
                <span className="comment-count">({post.comments?.length || 0})</span>
              </h3>

              {/* Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleCommentSubmit} className="comment-form">
                  <div className="form-group">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write a comment..."
                      rows="3"
                      maxLength="500"
                    />
                    <span className="char-count">{comment.length}/500</span>
                  </div>
                  {commentError && <p className="error-text">{commentError}</p>}
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting || !comment.trim()}
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              ) : (
                <div className="login-prompt">
                  <p>
                    <Link to="/login">Login</Link> or <Link to="/register">Register</Link> to leave a comment
                  </p>
                </div>
              )}

              {/* Comments List */}
              <div className="comments-list">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.slice().reverse().map((comment, index) => (
                    <div key={comment._id || index} className="comment-item">
                      <div className="comment-avatar">
                        {comment.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-username">{comment.username}</span>
                          <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                        <p className="comment-message">{comment.message}</p>
                        {isAuthenticated && user?.username === comment.username && (
                          <button 
                            className="delete-comment-btn"
                            onClick={() => handleDeleteComment(comment._id)}
                            disabled={deletingComment === comment._id}
                          >
                            {deletingComment === comment._id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-comments">
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetails;

