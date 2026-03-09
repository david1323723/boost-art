import React, { useState, useEffect } from 'react';
import axios from '../api';
import './Messages.css';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/messages');
      setMessages(response.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');
      
      const response = await axios.post('/api/users/messages', {
        message: newMessage
      });

      setMessages(prevMessages => [response.data.messageData, ...prevMessages]);
      setNewMessage('');
      setSuccess('Message sent successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
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

  return (
    <div className="messages-page">
      <div className="container">
        <div className="page-header">
          <h1>Messages</h1>
          <p>Contact the admin or view your message history</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="messages-container">
          {/* Send Message Form */}
          <div className="send-message-section card">
            <h3>Send Message to Admin</h3>
            <form onSubmit={handleSendMessage}>
              <div className="form-group">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows="4"
                  maxLength="1000"
                  disabled={sending}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={sending || !newMessage.trim()}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Message History */}
          <div className="message-history-section">
            <h3>Your Messages</h3>
            
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <h3>No messages yet</h3>
                <p>Send a message to start a conversation with the admin.</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg) => (
                  <div 
                    key={msg._id} 
                    className={`message-item ${msg.adminReply ? 'has-reply' : ''}`}
                  >
                    <div className="message-header">
                      <span className="message-date">{formatDate(msg.createdAt)}</span>
                      {!msg.isRead && <span className="badge badge-primary">New</span>}
                    </div>
                    <div className="message-body">
                      <p>{msg.message}</p>
                    </div>
                    
                    {/* Admin Reply */}
                    {msg.adminReply && (
                      <div className="admin-reply">
                        <div className="reply-header">
                          <span className="reply-label">Admin Reply:</span>
                          <span className="reply-date">
                            {formatDate(msg.adminReply.repliedAt)}
                          </span>
                        </div>
                        <p>{msg.adminReply.replyMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;

