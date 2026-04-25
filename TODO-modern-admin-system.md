# Modern Admin System Reset TODO

**Status:** In progress

PHASE 1: Clean Database
1. ~~Create TODO~~
2. [ ] Delete all admin data from MongoDB
3. ~~Delete legacy files~~

PHASE 2: Unified User Model
4. Update models/User.js → add role field

PHASE 3: Seed Default Admin
5. server.js startup seed boostart/123456 if no admin

PHASE 4: Unified Auth Routes
6. Create routes/auth.js (register, login, profile, update-profile)

PHASE 5: Backend Cleanup
7. Update server.js → use /api/auth routes
8. Delete routes/adminRoutes.js, middleware/adminAuth.js

PHASE 6: Frontend Update
9. Update AuthContext.js → single token/role system
10. Update AdminLogin.js → /api/auth/login
11. Update AdminSettings.js → /api/auth/update-profile

PHASE 7: Routing & Protection
12. AdminRoute.js → check role === "admin"
13. Test full flow

**Goal:** One User model, role-based, no hardcoded
