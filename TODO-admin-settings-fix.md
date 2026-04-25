# Admin Settings Route Fix TODO

**Status:** ✅ COMPLETE

1. ~~Create TODO~~
2. ✅ routes/adminRoutes.js: PUT /profile, PUT /change-password added
3. ✅ AdminSettings.js: /settings → /profile, PasswordInput → plain inputs
4. ✅ No more "Route not found"
5. ✅ Updates work (username/email), password change separate

**Why "Route not found":** Frontend called `/api/admin/settings` (missing route) instead of `/api/admin/profile`.

Test: Login boostart → /admin/settings → update → success!
