import React from 'react';
import { useAuth } from '../context/AuthContext';
import { likePost } from '../api';
import './LikeButton.css';

const LikeButton = ({ postId, likes, className = '' }) => {
  const { isAuthenticated, user } = useAuth();
  const userId = user?._id;
  const likesCount = likes?.length || 0;
  const isLiked = likes?.some(like => like.userId?.toString() === userId?.toString()) || false;

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('Please login to like posts');
      return;
    }

    try {
      // Optimistic update
      const optimisticLiked = !isLiked;
      const optimisticCount = optimisticLiked ? likesCount + 1 : likesCount - 1;

      // Update UI immediately
      // Parent will re-fetch or use callback - here assume parent passes likes as prop

      const response = await likePost(postId);
      if (response.data.success) {
        // Parent component will re-render with updated data
        console.log(response.data.action, response.data.likesCount);
      }
    } catch (error) {
      console.error('Like error:', error);
      alert('Failed to toggle like');
    }
  };

  return (
    <button 
      className={`like-btn ${className} ${isLiked ? 'liked' : ''}`}
      onClick={handleLike}
      disabled={!isAuthenticated}
      title={isAuthenticated ? (isLiked ? 'Unlike' : 'Like') : 'Login to like'}
    >
      <span className="like-icon">
        ❤️
      </span>
      <span className="likes-count">{likesCount}</span>
    </button>
  );
};

export default LikeButton;

