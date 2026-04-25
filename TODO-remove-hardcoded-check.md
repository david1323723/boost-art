# Remove "Cannot update hardcoded admin" TODO

**Status:** ✅ COMPLETE

1. ~~Create TODO~~
2. ✅ Removed `if (adminId.startsWith('admin-'))` blocks from PUT /profile & /change-password
3. ✅ DB admin updates now work (JWT id lookup)
4. ✅ boostart → boostart1 updates succeed
5. ✅ No more blocking errors

**Why blocked:** Legacy hardcoded token check `admin-001` (non-DB admin) - removed for DB admin freedom.

Updates fully functional!
