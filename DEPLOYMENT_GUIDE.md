# NextHire AI - Production Deployment Guide

## 🚀 Quick Start

This guide walks you through deploying NextHire AI to production:
- **Frontend:** Vercel
- **Backend:** Render

---

## Prerequisites

- GitHub account with this repository
- Vercel account (https://vercel.com)
- Render account (https://render.com)
- Google API Key (for Gemini AI)

---

## Step 1: Get Your Google API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (you'll need it later)

---

## Step 2: Deploy Backend to Render

### Quick Deploy (5 minutes)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Create Service on Render:**
   - Go to https://dashboard.render.com/new/web
   - Connect GitHub
   - Repository: Your NextHire repo
   - Branch: `main`
   - Root Directory: `backend`

3. **Build Settings:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT --timeout 60 app:app`

4. **Environment Variables:**
   - `NEXTHIRE_AI_API_KEY`: Your Google API key
   - `FLASK_ENV`: `production`
   - `CORS_ORIGINS`: (leave empty for now, update after Vercel deployment)

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (~2 minutes)
   - You'll get a URL: `https://nexthire-ai-backend-xxxxx.onrender.com`
   - **Save this URL**

### Verify Backend

```bash
curl https://your-render-url.com/api/test
# Should return: {"message":"Backend working!"}
```

---

## Step 3: Deploy Frontend to Vercel

### Quick Deploy (3 minutes)

1. **Create Project on Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Framework Preset: `Vite`
   - Root Directory: `frontend`

2. **Environment Variables:**
   - For **Production**:
     - `VITE_API_URL`: Your Render backend URL
     - Example: `https://nexthire-ai-backend-xxxxx.onrender.com`

3. **Deploy:**
   - Click "Deploy"
   - Wait for deployment (~1 minute)
   - You'll get a URL: `https://nexthire-ai.vercel.app`
   - **Save this URL**

---

## Step 4: Enable CORS on Backend

1. **Go to Render Dashboard**
2. **Select your backend service**
3. **Settings → Environment**
4. **Update `CORS_ORIGINS`:**
   ```
   https://your-vercel-url.vercel.app
   ```
   Example: `https://nexthire-ai.vercel.app`

5. **Redeploy:**
   - The service will automatically redeploy with new env vars
   - Check logs to confirm: "Deployment started..."

---

## ✅ Testing the Connection

### Test Backend Health
```bash
curl https://your-render-url.com/api/test
```

### Test API Call from Frontend
1. Go to `https://your-vercel-url.vercel.app`
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Try the Resume Builder
5. Verify API calls go to your backend URL (in Network tab)

---

## Environment Variables Reference

### Backend (.env on Render)

```
# Required
NEXTHIRE_AI_API_KEY=your_google_api_key

# Required for production
FLASK_ENV=production
CORS_ORIGINS=https://your-vercel-url.vercel.app

# Optional
NEXTHIRE_AI_MODEL=gemini-2.0-flash
PORT=5000
```

### Frontend (.env.production on Vercel)

```
VITE_API_URL=https://your-render-url.onrender.com
```

---

## 🐛 Troubleshooting

### CORS Error: "Access to XMLHttpRequest blocked"
- ✅ Verify `CORS_ORIGINS` on Render includes your Vercel domain
- ✅ Verify `VITE_API_URL` on Vercel matches your Render URL
- ✅ Redeploy both services after changes

### API Returns 401/403
- ✅ Check `NEXTHIRE_AI_API_KEY` is set on Render
- ✅ Verify API key is valid and not expired
- ✅ Check Render logs for error details

### "Cannot reach backend"
- ✅ Verify backend service is running (check Render dashboard)
- ✅ Check API URL has no typos
- ✅ Wait 5 minutes for initial deployment to complete

### PDF Generation Fails
- ✅ Backend must have weasyprint/pdfkit installed
- ✅ Check Render logs: `pip install` output
- ✅ Some system dependencies may be missing (wkhtmltopdf)

### First Request Takes 30+ Seconds
- ✅ This is normal on Render free tier (service spins down)
- ✅ First request after inactivity loads ML models (~30s)
- ✅ Upgrade to Render paid tier for faster response

---

## File Structure for Deployment

```
NextHire-AI/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt          ← Render uses this
│   ├── Procfile                  ← Render uses this
│   ├── runtime.txt               ← Specifies Python version
│   ├── .env.example              ← Template for env vars
│   ├── DEPLOYMENT.md             ← Backend setup guide
│   └── templates/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json               ← Vercel uses this
│   ├── .env.example              ← Template for env vars
│   ├── .env.production           ← Production values
│   ├── DEPLOYMENT.md             ← Frontend setup guide
│   └── dist/                     ← Built files (Vercel serves this)
└── README.md
```

---

## Monitoring & Debugging

### View Backend Logs (Render)
- Dashboard → Service → Logs
- Or: `curl https://your-app.onrender.com/logs`

### View Frontend Logs (Vercel)
- Dashboard → Deployments → Click deployment → Logs

### Check API Health
- Frontend: Open DevTools → Network tab → Make API call
- Backend: `curl https://your-backend.onrender.com/api/test`

---

## Updates & Redeployment

### Update Backend Code
```bash
git add .
git commit -m "Update backend"
git push origin main
# Render auto-deploys from main branch
```

### Update Frontend Code
```bash
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys from main branch
```

### Update Environment Variables
- On Render or Vercel dashboard
- Service redeploys automatically

---

## Production Checklist

- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] Google API key configured on Render
- [ ] CORS_ORIGINS configured on Render
- [ ] VITE_API_URL configured on Vercel
- [ ] Backend health check works
- [ ] Frontend loads without 404 errors
- [ ] API calls return data from backend
- [ ] Resume generation works (requires PDF dependencies)
- [ ] No console errors in DevTools

---

## Next Steps (Optional Improvements)

1. **Custom Domain:**
   - Vercel: Add custom domain in Settings
   - Render: Use CNAME record

2. **SSL Certificate:**
   - Both Vercel & Render provide free SSL

3. **Monitoring:**
   - Set up Render alerts in dashboard
   - Monitor Vercel Analytics

4. **Optimize Performance:**
   - Enable image optimization
   - Add caching headers

---

## Support & Help

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Vite Docs:** https://vite.dev
- **Flask Docs:** https://flask.palletsprojects.com
- **React Docs:** https://react.dev

