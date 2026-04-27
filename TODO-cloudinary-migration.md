# Cloudinary Migration TODO

## Steps to Complete

- [x] 1. Analyze codebase and understand current upload flow
- [x] 2. Update `utils/cloudinary.js` — Add CloudinaryStorage + delete helper
- [x] 3. Update `server.js` — Remove local storage, use Cloudinary for POST /api/posts
- [x] 4. Update `routes/adminRoutes.js` — Remove local storage, use Cloudinary for update/delete
- [x] 5. Update `client/src/pages/admin/AdminUpload.js` — Fix navigation timeout
- [x] 6. Verify `package.json` has required dependencies
- [x] 7. Test and validate — all local upload references removed
