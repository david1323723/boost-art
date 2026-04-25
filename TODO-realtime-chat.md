# Real-Time Admin Chat System - Implementation Plan

## Overview
Build a WhatsApp-style real-time messaging system where admin can chat with any registered user.

## Dependencies to Install
- **Backend**: `socket.io`
- **Frontend**: `socket.io-client`

## Files to Create

### 1. `utils/filterBadWords.js`
Reusable bad word filter utility:
- Blacklist array of inappropriate words
- `filterMessage(message)` function returns `{ clean: boolean, warning?: string }`
- Used in both REST API and Socket.io handlers

### 2. `models/ChatMessage.js`
New model for real-time chat messages:
- `senderId` (ObjectId, ref: User, required)
- `receiverId` (ObjectId, ref: User, required)
- `message` (String, required)
- `isRead` (Boolean, default: false)
- `createdAt` (Date, default: Date.now)

### 3. `client/src/pages/admin/AdminChat.js`
Main chat component with:
- Left sidebar: list of all registered users
- Right panel: chat window with selected user
- Message bubbles aligned left/right by sender
- Input box to send messages
- Real-time message updates via Socket.io
- Bad word filter warning display

### 4. `client/src/pages/admin/AdminChat.css`
WhatsApp-style styling:
- User list sidebar with avatars/last message
- Chat header with user info
- Message bubbles (green for admin, white for user)
- Input area with send button
- Responsive layout

## Files to Edit

### 5. `server.js`
- Add `socket.io` server setup
- Handle socket events: `connection`, `join-room`, `send-message`, `disconnect`
- Broadcast messages to appropriate rooms
- CORS configuration for Socket.io
- Integrate bad word filter in Socket.io handler

### 6. `routes/adminRoutes.js`
New routes:
- `GET /users` - Get all registered users (adminAuth protected)
- `GET /messages/:userId` - Get chat history between admin and user (adminAuth protected)
- `POST /messages` - Send a message (adminAuth protected, bad word filtered)

### 7. `client/src/App.js`
- Add `/admin/chat` route with AdminRoute wrapper

### 8. `client/src/components/Navbar.js`
- Add "Chat" link to admin navigation

## Data Flow
1. Admin logs in and navigates to `/admin/chat`
2. Frontend fetches all users via `GET /api/admin/users`
3. Admin clicks a user -> joins Socket.io room `chat_${adminId}_${userId}`
4. Frontend fetches chat history via `GET /api/admin/messages/${userId}`
5. Admin types message -> checked by bad word filter
6. If clean: emitted via Socket.io, saved to DB, broadcast to room
7. If blocked: warning returned, NOT saved or broadcast
8. Both admin and user receive clean messages in real-time

## Security & Moderation
- All chat API routes protected by `adminAuth` middleware
- Socket.io connections validated via JWT token
- Bad word filter on both REST API and Socket.io paths
- Blocked messages never saved to DB or broadcast
- Only admin can initiate/view all user conversations
- Messages stored with senderId/receiverId for audit trail

## Follow-up Steps
- [x] Install dependencies (backend + frontend)
- [x] Create bad word filter utility
- [x] Create database model
- [x] Implement backend routes + Socket.io
- [x] Build frontend components
- [x] Update routing and navigation
- [ ] Test end-to-end flow including filter

