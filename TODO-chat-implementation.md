# Chat System Implementation TODO

## Backend
- [x] 1. Edit `server.js` — add online/offline tracking, real-time read receipts (`message-read`), fix cross-conversation message leaks
- [x] 2. Edit `routes/messageRoutes.js` — add `PUT /api/messages/read/:userId` endpoint

## Frontend
- [x] 3. Edit `client/src/pages/Messages.js` — filter socket messages by selected conversation, read receipt sync, mobile back button, reliable admin auto-select
- [x] 4. Edit `client/src/pages/Messages.css` — mobile responsive sidebar toggle, message animations
- [x] 5. Edit `client/src/App.js` — redirect legacy `/admin/messages` → `/messages`, clean unused imports
- [x] 6. Edit `client/src/pages/admin/AdminDashboard.js` — point Messages card to `/messages`
- [x] 7. Edit `client/src/components/Navbar.js` — add real-time unread badge on Messages link

## Cleanup
- [x] 8. Replace `AdminMessages.js` with redirect wrapper
- [x] 9. Replace `AdminChat.js` with redirect wrapper

## DEBUGGING ROUND 2 — Critical Stability Fixes
- [x] 10. Fix `Messages.js` stale closure bug — socket handlers now use `useRef` for `selectedUser`
- [x] 11. Fix unread count clearing — combined sequential `setConversations` into single update
- [x] 12. Fix `totalUnread` increment logic — only increments for non-selected conversations
- [x] 13. Add optimistic UI update — messages appear instantly, replaced by server response
- [x] 14. Fix `server.js` socket error handling — all handlers wrapped in try-catch
- [x] 15. Fix online user tracking — support multiple tabs per user with Map<userId, Set<socketId>>
- [x] 16. Fix `Message` model — added `{ timestamps: true }` for automatic createdAt/updatedAt
- [x] 17. Add `callback` type checks in server.js to prevent crashes on malformed socket calls

