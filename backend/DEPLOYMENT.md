# NextHire AI Backend - Deployment Guide

## Local Development

### Prerequisites
- Python 3.11+
- pip or conda

### Setup

1. **Create Virtual Environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure Environment Variables:**
```bash
cp .env.example .env
```
Edit `.env` and add your Google API key:
- Get key from: https://makersuite.google.com/app/apikey
- Set `NEXTHIRE_AI_API_KEY` or `GOOGLE_API_KEY`

4. **Run Development Server:**
```bash
python app.py
```
Server runs on `http://localhost:5000`

---

## Production Deployment on Render

### Prerequisites
- Render account (https://render.com)
- GitHub repository with this code

### Step-by-Step Setup

1. **Push Code to GitHub:**
```bash
git add .
git commit -m "Add production configuration"
git push origin main
```

2. **Create New Web Service on Render:**
   - Go to https://dashboard.render.com/new/web
   - Connect your GitHub repository
   - Select the branch (main)
   - Fill in settings:
     - **Name:** nexthire-ai-backend
     - **Root Directory:** backend
     - **Runtime:** Python 3
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --timeout 60 app:app`

3. **Set Environment Variables in Render Dashboard:**
   - Go to your service → Environment
   - Add these variables:
     - `NEXTHIRE_AI_API_KEY`: Your Google API key
     - `GOOGLE_API_KEY`: Your Google API key (backup)
     - `FLASK_ENV`: `production`
     - `CORS_ORIGINS`: `https://yourdomain.vercel.app`

4. **Deploy:**
   - Render will automatically deploy when you push to GitHub
   - Watch the deployment logs in the Render dashboard
   - Once deployed, you'll get a URL like: `https://nexthire-ai-backend.onrender.com`

5. **Update Frontend:**
   - In the frontend, update `.env.production`:
     ```
     VITE_API_URL=https://nexthire-ai-backend.onrender.com
     ```

### Monitoring

- **View Logs:** Render Dashboard → Service → Logs
- **Health Check:** `curl https://nexthire-ai-backend.onrender.com/api/test`
- **Expected Response:** `{"message":"Backend working!"}`

### Important Notes

- **Free Tier Limitations:**
  - Web Service spins down after 15 minutes of inactivity
  - First request after spin-down will be slow
  - Upgrade to paid tier for always-on service

- **Cold Start Issues:**
  - ATS semantic scoring now uses a lightweight fallback path
  - First request may still be slower if NLTK downloads stopwords on demand

- **File Uploads:**
  - Render has 10GB storage per service
  - Temporary files are cleaned up automatically

---

## Troubleshooting

### 500 Error on `/api/ats-score`
- Check API key is set in Render environment variables
- Check logs: `curl https://your-app.onrender.com/logs`

### CORS Errors
- Ensure `CORS_ORIGINS` includes your Vercel frontend URL
- Format: `https://yourdomain.vercel.app` (no trailing slash)

### PDF Generation Failed
- weasyprint or pdfkit might not be installed
- Render installs from requirements.txt automatically
- Check installation logs in Render dashboard

### Timeout Errors
- ML model loading may timeout on first request
- Increase timeout in Procfile if needed: `--timeout 120`
