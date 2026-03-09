import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminMessages.css';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get('/api/admin/messages');
      setMessages(response.data);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await axios.put(`/api/admin/messages/${messageId}/read`);
      setMessages(messages.map(msg => 
        msg._id === messageId ? { ...msg, isRead: true } : msg
      ));
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const handleReply = async (messageId) => {
    if (!replyText.trim()) return;

    try {
      setSending(true);
      const response = await axios.post(`/api/admin/messages/${messageId}/reply`, {
        replyMessage: replyText
      });
      
      setMessages(messages.map(msg => 
        msg._id === messageId ? response.data.messageData : msg
      ));
      setReplyText('');
      setSelectedMessage(null);
    } catch (err) {
      setError('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await axios.delete(`/api/admin/messages/${messageId}`);
      setMessages(messages.filter(msg => msg._id !== messageId));
    } catch (err) {
      setError('Failed to delete message');
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

  const unreadCount = messages.filter(m => !m.isRead).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="admin-messages">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Messages</h1>
            <p>View messages from users {unreadCount > 0 && `(${unreadCount} unread)`}</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {messages.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>No messages yet</h3>
            <p>Messages from users will appear here</p>
          </div>
        ) : (
          <div className="messages-container">
            <div className="messages-list">
              {messages.map((message) => (
                <div 
                  key={message._id} 
                  className={`message-card ${!message.isRead ? 'unread' : ''} ${selectedMessage === message._id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMessage(message._id);
                    if (!message.isRead) handleMarkAsRead(message._id);
                  }}
                >
                  <div className="message-info">
                    <div className="message-sender">
                      <span className="sender-name">{message.senderName}</span>
                      {!message.isRead && <span className="unread-badge">New</span>}
                    </div>
                    <span className="message-date">{formatDate(message.createdAt)}</span>
                  </div>
                  <p className="message-preview">
                    {message.message.length > 100 
                      ? message.message.substring(0, 100) + '...' 
                      : message.message}
                  </p>
                  {message.adminReply && (
                    <span className="replied-badge">Replied</span>
                  )}
                </div>
              ))}
            </div>

            {selectedMessage && (
              <div className="message-detail">
                {(() => {
                  const msg = messages.find(m => m._id === selectedMessage);
                  if (!msg) return null;
                  
                  return (
                    <>
                      <div className="detail-header">
                        <div>
                          <h3>{msg.senderName}</h3>
                          <span className="detail-email">{msg.senderEmail}</span>
                        </div>
                        <span className="detail-date">{formatDate(msg.createdAt)}</span>
                      </div>
                      
                      <div className="detail-body">
                        <p>{msg.message}</p>
                      </div>

                      {msg.adminReply && (
                        <div className="admin-reply-section">
                          <div className="reply-header">
                            <span>Your Reply</span>
                            <span>{formatDate(msg.adminReply.repliedAt)}</span>
                          </div>
                          <p>{msg.adminReply.replyMessage}</p>
                        </div>
                      )}

                      {!msg.adminReply && (
                        <div className="reply-form">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows="4"
                          />
                          <div className="reply-actions">
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleReply(msg._id)}
                              disabled={sending || !replyText.trim()}
                            >
                              {sending ? 'Sending...' : 'Send Reply'}
                            </button>
                          </div>
                        </div>
                      )}

                      <button 
                        className="btn btn-danger btn-sm delete-message"
                        onClick={() => handleDelete(msg._id)}
                      >
                        Delete Message
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;

