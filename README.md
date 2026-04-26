# Boost Art

A full-stack MERN application for a creative art gallery platform.

## Production URLs

- **Frontend (Vercel):** https://boost-art-drab.vercel.app
- **Backend API (Render):** https://boost-art-backend.onrender.com
- **API Base Path:** https://boost-art-backend.onrender.com/api

## Environment Variables

### Backend (.env)

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/boostart
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://boost-art-drab.vercel.app
API_BASE_URL=https://boost-art-backend.onrender.com
NODE_ENV=production
```

### Frontend (client/.env)

```env
REACT_APP_API_URL=https://boost-art-backend.onrender.com
REACT_APP_SOCKET_URL=https://boost-art-backend.onrender.com
```

## Features

- Image & Video uploads with category filtering
- User authentication (login/register)
- Admin dashboard with content management
- Real-time chat between users and admin
- Like/comment system on posts
- Light/Dark theme toggle

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/profile` | GET | Get user profile |
| `/api/auth/update-profile` | PUT | Update profile |
| `/api/users/posts` | GET | Fetch all gallery posts |
| `/api/posts/:id` | GET | Get single post details |
| `/api/admin/login` | POST | Admin login |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/messages` | POST | Send message (REST) |
| `/api/messages/conversations` | GET | Get chat conversations |

## Deployment Checklist

- [ ] Set `MONGO_URI` in Render environment variables
- [ ] Set `JWT_SECRET` to a strong random string
- [ ] Set `FRONTEND_URL` to your Vercel domain
- [ ] Set `API_BASE_URL` to your Render domain
- [ ] Set `NODE_ENV=production` on Render
- [ ] Set `REACT_APP_API_URL` in Vercel environment variables
- [ ] Run `node fix-media-urls.js` once to update old localhost image URLs in the database

## How to Run Locally

```bash
# Backend
npm install
npm run dev

# Frontend
cd client
npm install
npm start
```

## Default Admin

- **Username:** boostart
- **Password:** 123456

> **Note:** Change the default admin password immediately after first login.

