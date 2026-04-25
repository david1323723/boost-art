import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from '../api';
import './Messages.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const selectedUserRef = useRef(null);
  const userIdRef = useRef(null);
  const messagesRef = useRef([]);

  // Keep refs in sync with state to avoid stale closures in socket handlers
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Get current user from localStorage
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUser(user);
      userIdRef.current = user?._id || null;
    } catch {
      setCurrentUser(null);
      userIdRef.current = null;
    }
  }, []);

  const userId = currentUser?._id;
  const isAdmin = currentUser?.isAdmin;

  // Initialize Socket.io connection — only once per userId
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !userIdRef.current) return;

    const newSocket = io(
      process.env.NODE_ENV === 'production'
        ? 'https://boost-art-api.onrender.com'
        : 'http://localhost:5000',
      {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      }
    );

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // CRITICAL FIX: use refs inside handler so we always have latest selectedUser
    newSocket.on('new-message', (message) => {
      const myId = userIdRef.current;
      const currentSelected = selectedUserRef.current;
      const otherId = message.senderId._id === myId
        ? message.receiverId._id
        : message.senderId._id;

      // Only add to active conversation if it matches the selected user
      if (currentSelected && otherId === currentSelected._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        // Emit read receipt immediately since we're viewing this conversation
        newSocket.emit('message-read', { otherUserId: otherId });
      }

      // Update sidebar conversation list
      setConversations(prev => {
        const exists = prev.find(c => c.user._id === otherId);
        if (exists) {
          const isFromOther = message.senderId._id !== myId;
          const isNotSelected = !currentSelected || currentSelected._id !== otherId;
          return prev.map(c =>
            c.user._id === otherId
              ? {
                  ...c,
                  lastMessage: message,
                  unreadCount: isFromOther && isNotSelected
                    ? (c.unreadCount || 0) + 1
                    : c.unreadCount
                }
              : c
          ).sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
              return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return 0;
          });
        }
        return prev;
      });

      // Update global unread count only if message is from someone else and not in current view
      if (message.senderId._id !== myId) {
        const isNotSelected = !currentSelected || currentSelected._id !== otherId;
        if (isNotSelected) {
          setTotalUnread(prev => {
            const next = prev + 1;
            window.dispatchEvent(new CustomEvent('chat-unread-update', { detail: { count: next } }));
            return next;
          });
        }
      }
    });

    // Real-time read receipts: update ✓ → ✓✓
    newSocket.on('messages-read-by', ({ readerId }) => {
      const myId = userIdRef.current;
      setMessages(prev =>
        prev.map(msg =>
          msg.senderId._id === myId && msg.receiverId._id === readerId && !msg.isRead
            ? { ...msg, isRead: true, readAt: new Date() }
            : msg
        )
      );
    });

    newSocket.on('message-blocked', ({ warning }) => {
      setWarning(warning);
      setSending(false);
      setTimeout(() => setWarning(''), 4000);
    });

    newSocket.on('user-typing', ({ userId: typingUserId, username, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [typingUserId]: isTyping ? username : null }));
    });

    newSocket.on('online-users', ({ users }) => {
      setOnlineUsers(new Set(users));
    });

    newSocket.on('user-online', ({ userId: onlineId }) => {
      setOnlineUsers(prev => new Set([...prev, onlineId]));
    });

    newSocket.on('user-offline', ({ userId: offlineId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(offlineId);
        return next;
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Fetch conversations and initialize sidebar
  useEffect(() => {
    if (!currentUser) return;

    const initializeChat = async () => {
      try {
        if (isAdmin) {
          const [convRes, usersRes] = await Promise.all([
            axios.get('/messages/conversations'),
            axios.get('/users')
          ]);

          const conversationsData = convRes.data.conversations || [];
          const allUsers = usersRes.data.users || [];
          const userMap = new Map();

          conversationsData.forEach(conv => {
            userMap.set(conv.user._id, { ...conv, hasConversation: true });
          });

          allUsers.forEach(user => {
            if (!userMap.has(user._id)) {
              userMap.set(user._id, {
                user,
                lastMessage: null,
                unreadCount: 0,
                hasConversation: false
              });
            }
          });

          const merged = Array.from(userMap.values()).sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
              return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return (a.user.fullName || a.user.username).localeCompare(b.user.fullName || b.user.username);
          });

          setConversations(merged);

          const total = merged.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setTotalUnread(total);
          window.dispatchEvent(new CustomEvent('chat-unread-update', { detail: { count: total } }));

          const firstWithMessages = merged.find(c => c.hasConversation);
          if (firstWithMessages) {
            setSelectedUser(firstWithMessages.user);
          } else if (merged.length > 0) {
            setSelectedUser(merged[0].user);
          }
        } else {
          const response = await axios.get('/users/admin');
          const admin = response.data.admin;

          if (admin) {
            let convData = null;
            try {
              const convRes = await axios.get('/messages/conversations');
              convData = (convRes.data.conversations || []).find(c => c.user._id === admin._id);
            } catch {
              // no conversations yet
            }

            const unread = convData?.unreadCount || 0;
            setConversations([{
              user: admin,
              lastMessage: convData?.lastMessage || null,
              unreadCount: unread,
              hasConversation: !!convData
            }]);
            setSelectedUser(admin);
            setTotalUnread(unread);
            window.dispatchEvent(new CustomEvent('chat-unread-update', { detail: { count: unread } }));
          }
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err);
        setError('Failed to load chat users');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [currentUser, isAdmin]);

  // Load chat history when selected user changes
  useEffect(() => {
    if (!selectedUser || !userIdRef.current) return;

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/messages/${selectedUser._id}`);
        const fetchedMessages = response.data.messages || [];
        setMessages(fetchedMessages);

        // Clear unread for this conversation and recalculate total in one pass
        setConversations(prev => {
          const updated = prev.map(c =>
            c.user._id === selectedUser._id
              ? { ...c, unreadCount: 0 }
              : c
          );
          const total = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setTotalUnread(total);
          window.dispatchEvent(new CustomEvent('chat-unread-update', { detail: { count: total } }));
          return updated;
        });
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load messages');
      }
    };

    fetchMessages();

    if (socketRef.current) {
      socketRef.current.emit('join-chat', { otherUserId: selectedUser._id });
      socketRef.current.emit('message-read', { otherUserId: selectedUser._id });
    }

    // Mobile: hide sidebar when conversation selected
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false);
    }

    return () => {
      if (socketRef.current && selectedUser) {
        socketRef.current.emit('leave-chat', { otherUserId: selectedUser._id });
      }
    };
  }, [selectedUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !selectedUser || !socketRef.current) return;

    setSending(true);
    setWarning('');
    setError('');

    // Optimistically add message to UI immediately
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      senderId: { _id: userIdRef.current },
      receiverId: { _id: selectedUser._id },
      message: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setInputMessage('');

    socketRef.current.emit('send-message', {
      receiverId: selectedUser._id,
      message: text
    }, (response) => {
      setSending(false);
      if (response.success) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(m => (m._id === optimisticMessage._id ? response.message : m))
        );

        setConversations(prev => {
          const updated = prev.map(c =>
            c.user._id === selectedUser._id
              ? { ...c, lastMessage: response.message, hasConversation: true }
              : c
          ).sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
              return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return 0;
          });
          return updated;
        });
      } else if (response.blocked) {
        // Remove optimistic message on block
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        setWarning(response.error);
        setTimeout(() => setWarning(''), 4000);
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        setError(response.error || 'Failed to send message');
      }
    });
  }, [inputMessage, selectedUser]);

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    if (socketRef.current && selectedUser) {
      socketRef.current.emit('typing', { receiverId: selectedUser._id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing', { receiverId: selectedUser._id, isTyping: false });
        }
      }, 2000);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isTyping = selectedUser && typingUsers[selectedUser._id];

  const getLastMessagePreview = (conv) => {
    if (!conv.lastMessage) return 'No messages yet';
    const isMe = conv.lastMessage.senderId._id === userId || conv.lastMessage.senderId === userId;
    const prefix = isMe ? 'You: ' : '';
    const text = conv.lastMessage.message;
    return prefix + (text.length > 30 ? text.substring(0, 30) + '...' : text);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setError('');
    setWarning('');
  };

  const handleBackToSidebar = () => {
    setMobileSidebarOpen(true);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className={`chat-page ${mobileSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Left Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>{isAdmin ? 'Chats' : 'Admin Chat'}</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="users-list">
          {filteredConversations.length === 0 ? (
            <div className="no-users">
              <p>{isAdmin ? 'No users found' : 'Admin not available'}</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.user._id}
                className={`user-item ${selectedUser?._id === conv.user._id ? 'active' : ''}`}
                onClick={() => handleSelectUser(conv.user)}
              >
                <div className="user-avatar">
                  {conv.user.avatar ? (
                    <img src={conv.user.avatar} alt={conv.user.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(conv.user.fullName || conv.user.username)?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`status-dot ${onlineUsers.has(conv.user._id) ? 'online' : 'offline'}`}></span>
                </div>
                <div className="user-info">
                  <div className="user-name-row">
                    <span className="user-name">{conv.user.fullName || conv.user.username}</span>
                    {conv.lastMessage && (
                      <span className="sidebar-time">{formatShortTime(conv.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <div className="user-preview-row">
                    <span className={`user-preview ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                      {getLastMessagePreview(conv)}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="chat-area">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="header-user">
                <button className="mobile-back-btn" onClick={handleBackToSidebar} aria-label="Back">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div className="user-avatar small">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(selectedUser.fullName || selectedUser.username)?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="header-info">
                  <h3>{selectedUser.fullName || selectedUser.username}</h3>
                  <span className="typing-indicator">
                    {isTyping ? 'typing...' : (onlineUsers.has(selectedUser._id) ? 'online' : selectedUser.email)}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {error && <div className="chat-alert error">{error}</div>}
              {warning && <div className="chat-alert warning">{warning}</div>}

              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet</p>
                  <span>Start a conversation with {selectedUser.fullName || selectedUser.username}</span>
                </div>
              ) : (
                Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                  <div key={date} className="message-group">
                    <div className="date-divider">
                      <span>{formatDate(dateMessages[0].createdAt)}</span>
                    </div>
                    {dateMessages.map((msg, index) => {
                      const isSent = msg.senderId._id === userId || msg.senderId === userId;
                      return (
                        <div
                          key={msg._id || index}
                          className={`message-bubble ${isSent ? 'sent' : 'received'} ${msg.isOptimistic ? 'optimistic' : ''}`}
                        >
                          <div className="message-content">
                            <p>{msg.message}</p>
                            <span className="message-time">
                              {formatTime(msg.createdAt)}
                              {isSent && (
                                <span className="read-status">
                                  {msg.isRead ? ' ✓✓' : ' ✓'}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form className="input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={inputMessage}
                onChange={handleTyping}
                placeholder="Type a message..."
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="send-btn"
              >
                {sending ? (
                  <span className="sending-dots">...</span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9"/>
                  </svg>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <h3>{isAdmin ? 'Select a user to start chatting' : 'Chat with Admin'}</h3>
            <p>{isAdmin
              ? 'Choose from the list on the left to view conversation history and send messages.'
              : 'Send a message to get in touch with the admin.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

