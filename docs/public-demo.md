# Public Demo Deployment

Use this path when you want someone outside your network to open Sola in a browser.

## Option A: Vercel Frontend Demo

This is the fastest public demo. It deploys the Next.js app and uses bundled sample data when no public API URL is configured.

1. Push the branch to GitHub.
2. Open Vercel and import `Githubdiaries/Sola`.
3. Set the project root directory to `frontend`.
4. Keep the framework preset as `Next.js`.
5. Leave `NEXT_PUBLIC_API_URL` unset for the public sample-data demo.
6. Deploy and share the generated `https://...vercel.app` URL.

## Option B: Hosted API Later

When the FastAPI backend is hosted publicly, set this frontend environment variable in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://your-public-api.example.com
```

Then redeploy the frontend. The app will fetch live GeoJSON from:

```bash
/api/v1/sites?limit=100
```

## Local Preview Before Sharing

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open `http://localhost:3000` and verify the public demo view before deploying.
