"# PropIntel — Test Credentials

## Admin Account
- Email: `admin@propintel.io`
- Password: `Demo2026!`
- Role: admin

## Auth Endpoints
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/me`

## Notes
- Backend seeds 60 mock properties on startup (vacant + tax-delinquent across PA, MI, OH, MD, TN, MO).
- JWT issued as `access_token` httpOnly cookie + also returned in response body. Frontend sends `Authorization: Bearer <token>` for API calls and stores token in localStorage.
"