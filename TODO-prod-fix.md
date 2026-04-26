# Production Fix TODO

## Backend (server.js)
- [x] Fix Socket.io CORS origin from `'*'` to `FRONTEND_URL`
- [x] Add startup validation: exit if `MONGO_URI` is undefined in production
- [x] Remove localhost fallback for MongoDB or add production warning

## Frontend API Client (client/src/api.js)
- [x] Export `BASE_URL` constant for reuse
- [x] Export `SOCKET_BASE_URL` for socket connections

## Frontend Socket (client/src/pages/Messages.js)
- [x] Replace hardcoded socket URL with env var `REACT_APP_SOCKET_URL`

## Environment Files
- [x] Create root `.env.example`
- [x] Create `client/.env.example`

## Scripts
- [x] Update `fix-media-urls.js` to use env vars
- [x] Update `clear-data.js` to not silently fallback to localhost

## Documentation
- [x] Update `README.md` with deployment instructions and required env vars

