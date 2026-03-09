import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'Graphic Design', label: 'Graphic Design' },
    { value: 'Photography', label: 'Photography' },
    { value: 'Video Production', label: 'Video Production' },
    { value: 'Advertising', label: 'Advertising' }
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/posts');
      setPosts(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="container">
        <div className="page-header text-center">
          <h1>Welcome to Boost Art</h1>
          <p>Explore our creative collection</p>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category.value}
              className={`filter-btn ${selectedCategory === category.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Gallery Grid */}
        {filteredPosts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <h3>No posts found</h3>
            <p>There are no posts in this category yet.</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredPosts.map(post => (
              <Link to={`/post/${post._id}`} key={post._id} className="gallery-card">
                <div className="card-media">
                  {post.mediaType === 'video' ? (
                    <video 
                      src={post.mediaUrl} 
                      alt={post.title}
                      poster={post.thumbnail}
                    />
                  ) : (
                    <img 
                      src={post.mediaUrl} 
                      alt={post.title}
                      loading="lazy"
                    />
                  )}
                  <div className="media-overlay">
                    <span className="view-details">View Details</span>
                  </div>
                  {post.mediaType === 'video' && (
                    <div className="video-badge">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="card-content">
                  <span className="card-category">{post.category}</span>
                  <h3 className="card-title">{post.title}</h3>
                  <p className="card-description">
                    {post.description ? post.description.substring(0, 80) + '...' : 'No description'}
                  </p>
                  <div className="card-meta">
                    <span className="card-date">{formatDate(post.createdAt)}</span>
                    <span className="card-comments">
                      {post.comments ? post.comments.length : 0} comments
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

