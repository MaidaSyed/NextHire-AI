# NextHire AI Frontend - Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Configure Environment Variables:**
```bash
cp .env.example .env
```
Edit `.env` to match your backend URL (typically `http://localhost:5000` for local development)

3. **Run Development Server:**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

---

## Production Deployment on Vercel

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with this code
- Backend deployed on Render (get the URL)

### Step-by-Step Setup

1. **Push Code to GitHub:**
```bash
git add .
git commit -m "Add production configuration"
git push origin main
```

2. **Connect to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the `frontend` directory as Root Directory
   - Click "Deploy"

3. **Configure Environment Variables in Vercel:**
   - After project is created, go to **Settings** → **Environment Variables**
   - Add these variables for **Production**:
     ```
     VITE_API_URL=https://nexthire-ai-backend.onrender.com
     ```
   - Also add for **Preview** and **Development** if needed:
     ```
     VITE_API_URL=http://localhost:5000
     ```

4. **Update Backend CORS Settings:**
   - On Render backend dashboard
   - Go to **Environment** variables
   - Update `CORS_ORIGINS` to include your Vercel domain:
     ```
     https://yourdomain.vercel.app
     ```
   - Redeploy the backend

5. **Deploy:**
   - Vercel automatically deploys on every push to main
   - Watch deployment progress in Vercel dashboard
   - Once deployed, you'll get a URL like: `https://nexthire-ai.vercel.app`

### Environment Variables Explained

- **VITE_API_URL**: The base URL for your backend API
  - Development: `http://localhost:5000`
  - Production: `https://nexthire-ai-backend.onrender.com` (your Render URL)

### Build Command Customization

Vercel automatically detects Vite and runs `npm run build`. To customize:

1. Go to **Settings** → **Build & Development Settings**
2. Set **Build Command**: `npm run build`
3. Set **Output Directory**: `dist`

### Available Vite Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

---

## Important Configuration Files

### vercel.json
- Configures Vercel deployment behavior
- Sets security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Handles SPA routing (all requests go to index.html)

### vite.config.js
- Uses `VITE_API_URL` environment variable
- Configures proxy for local development

### Environment Files
- `.env`: Local development (don't commit)
- `.env.example`: Template for environment variables
- `.env.production`: Production values (tracked in git)

---

## Troubleshooting

### API Calls Return 401/403 (CORS Error)
1. Check backend is running
2. Verify `VITE_API_URL` is correct in Vercel environment variables
3. Verify backend `CORS_ORIGINS` includes your Vercel domain
4. Redeploy backend after changing CORS_ORIGINS

### Build Fails on Vercel
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node version compatibility (18+ recommended)

### API Timeout Errors
- Backend may be spinning down on Render's free tier
- First request after inactivity is slower (~30s)
- Upgrade Render to paid tier for always-on service

### PDF Download Not Working
1. Verify backend `/api/generate-resume` endpoint
2. Check browser console for actual error
3. Verify API URL is correct

### Static Files Not Loading
- Vercel handles this automatically with `vercel.json`
- Check that files are in `dist/` after build

---

## Performance Tips

1. **Enable Caching:**
   - Vercel CDN caches static assets automatically
   - Use cache headers in `vercel.json`

2. **Optimize Images:**
   - Use modern image formats (WebP)
   - Compress before upload

3. **Lazy Load Components:**
   - Already implemented with React Router
   - Pages load only when needed

4. **Monitor Performance:**
   - Use Vercel Analytics dashboard
   - Check Core Web Vitals

---

## Connecting Frontend to Backend

### During Development
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- Vite proxy automatically routes `/api/*` calls to backend

### In Production
- Backend: `https://nexthire-ai-backend.onrender.com`
- Frontend: `https://yourdomain.vercel.app`
- Uses environment variable `VITE_API_URL`
- No proxy needed (direct HTTP calls)

---

## Rolling Back a Deployment

### On Vercel
1. Go to **Deployments**
2. Find the previous working deployment
3. Click **...** menu → **Promote to Production**

### On Render (Backend)
1. Go to service → **Deployment History**
2. Select previous deployment
3. Click **Redeploy**
