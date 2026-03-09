import axios from 'axios';

// Configure axios base URL
// In production (Vercel), use the Render URL
// In development, use relative paths (proxy will handle it)
const isProduction = process.env.NODE_ENV === 'production';

axios.defaults.baseURL = isProduction 
  ? 'https://boost-art-api.onrender.com' 
  : '';

export default axios;

