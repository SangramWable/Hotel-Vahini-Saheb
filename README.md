# Hotel Vahinisaheb

A restaurant website with a static frontend and an Express 5 API backed by MongoDB through Mongoose 9. The API provides menu, review, feedback, recommendation, and administrator-session endpoints.

## Project layout

- `frontend/pages/` contains the public and administrator HTML pages.
- `frontend/assets/` contains CSS, JavaScript, images, and video.
- `frontend/config.js` defines the API base URL. It is empty for the same-origin Vercel proxy and for the backend-served local site.
- `backend/src/` contains the Express app, routes, models, middleware, validation, and database connection.
- `backend/scripts/` contains the administrator provisioning and guarded seed scripts.
- `backend/tests/` contains mocked API tests that do not connect to MongoDB.

## Local setup

Requirements: Node.js 20.19 or newer, npm, and MongoDB Atlas or a local MongoDB instance.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGODB_URI` to a database you intend to use and set a random `JWT_SECRET` of at least 32 characters.
3. Keep `AUTO_SAMPLE_DATA=false`. Set `CORS_ORIGINS` to the exact browser origins you use if you serve the frontend separately; the backend-served site is same-origin.
4. Install and start the backend:

   ```powershell
   cd backend
   npm ci
   npm start
   ```

5. Open `http://localhost:5000/`. The backend serves the frontend and API on the same origin. The health endpoint is `http://localhost:5000/api/health`.

The backend requires `MONGODB_URI` and will not fall back to a configured database URI. Never put real credentials in committed files.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign administrator session tokens; minimum 32 characters |
| `PORT` | No | HTTP port; defaults to `5000` locally and is provided by Render in production |
| `CORS_ORIGINS` | For cross-origin requests | Comma-separated exact browser origins; configure the deployed Vercel origin |
| `NODE_ENV` | No | Set to `production` on Render |
| `AUTO_SAMPLE_DATA` | No | Defaults off; sample insertion only runs when explicitly `true` outside production |
| `ADMIN_USERNAME` | Provisioning only | Administrator username for the provisioning command |
| `ADMIN_PASSWORD` | Provisioning only | Unique administrator password of at least 12 characters |

Administrator passwords are stored as bcrypt hashes. Sessions use an eight-hour signed JWT in an `HttpOnly`, `SameSite=Strict` cookie, marked `Secure` in production. Use HTTPS in production.

## Provision an administrator

Set provisioning credentials only in the current shell or a secrets manager, never in source control. From `backend/`:

```powershell
$env:ADMIN_USERNAME = "your-admin-name"
$env:ADMIN_PASSWORD = "a-long-unique-password"
npm run provision-admin
Remove-Item Env:ADMIN_USERNAME
Remove-Item Env:ADMIN_PASSWORD
```

The script refuses to overwrite an existing account unless `--rotate-existing` is explicitly supplied. Remove the temporary provisioning variables from the deployment environment after provisioning.

## Tests and checks

From `backend/`:

```powershell
npm test
npm run lint
npm run check
npm audit --omit=dev
```

The Jest/Supertest tests mock Mongoose operations and do not connect to `MONGODB_URI`.

## API behavior

- Public review submissions are always stored as `pending`; public review reads return approved reviews only.
- Menu, review, and feedback list endpoints accept `page` and `limit`, cap the page size at 100, and keep JSON array responses. Pagination metadata is returned in `X-Total-Count`, `X-Page`, `X-Limit`, and `X-Total-Pages` headers. The frontend pages include Previous/Next controls.
- Administrator operations require the session cookie. Login is rate-limited; logout clears the cookie.
- Menu image values may be HTTP(S) URLs, safe relative paths, or supported JPEG/PNG/WebP data URLs up to the API's size limit.

## Deployment

The intended deployment is same-origin: Vercel serves the static frontend and rewrites `/api/*` to Render. The browser therefore uses the Vercel origin for both pages and API calls, allowing the strict same-site session cookie behavior. Do not deploy the frontend and API as separate browser-facing origins without first revisiting cookie, CORS, and CSRF protections.

### Render backend

The root `render.yaml` defines a Node web service named `hotel-vahini-saheb-api`, with `backend/` as its root, `npm install` as its build command, `npm start` as its start command, and `/api/health` as its health check. Set these secret environment variables in Render:

- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGINS` (the exact deployed Vercel origin)
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` for one-time provisioning

`NODE_ENV=production` and `AUTO_SAMPLE_DATA=false` are set by the Render configuration. Render supplies `PORT`.

### Vercel frontend

Set the Vercel project root directory to `frontend/`. Its `vercel.json` sends `/api/*` to `https://hotel-vahini-saheb-api.onrender.com/api/*`, serves the frontend pages from `pages/`, and leaves assets under `assets/`. If the Render service hostname changes, update the API rewrite destination in `frontend/vercel.json`.

## Seed safety warning

Do not run `npm run seed` against production or an unintended database. The script refuses to run without `--force` and refuses when `NODE_ENV=production`; it then connects to the configured MongoDB database, prints its name, and requires exact-name confirmation before deleting and replacing menu, review, and feedback records. It never seeds administrator accounts. Automatic sample insertion is off by default and only operates when `AUTO_SAMPLE_DATA=true` in non-production.
